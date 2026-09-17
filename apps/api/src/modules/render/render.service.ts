import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HandlebarsService } from '../template/handlebars.service';
import { RedisService } from '../redis/redis.service';
import { RenderRequest, RenderData } from '@cms/shared-types';

/**
 * Service orchestrating public template rendering, combining published templates,
 * content entries, custom data payloads, and Handlebars variable context.
 */
@Injectable()
export class RenderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly handlebarsService: HandlebarsService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Main render method executing the CMS rendering pipeline for an organization.
   */
  async render(orgId: string, request: RenderRequest): Promise<RenderData> {
    const { schemaId, templateId, contentId, data = {}, variables = {} } = request;

    if (!templateId && !schemaId) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Either "templateId" or "schemaId" must be provided to render',
      });
    }

    // 1. Resolve Target Template
    let template: any = null;
    if (templateId) {
      template = await this.redisService.getPublishedTemplate<any>(templateId);
      if (!template) {
        template = await this.prisma.template.findFirst({
          where: { id: templateId, orgId },
          include: {
            contentType: {
              select: { id: true, name: true, slug: true, schema: true },
            },
          },
        });

        if (!template) {
          throw new NotFoundException({
            code: 'TEMPLATE_NOT_FOUND',
            message: `Template ${templateId} not found in this organization`,
          });
        }

        if (!template.fieldsPublished && !template.bodyPublished) {
          throw new BadRequestException({
            code: 'TEMPLATE_NOT_PUBLISHED',
            message: `Template "${template.name}" has no published version to render`,
          });
        }

        await this.redisService.setPublishedTemplate(templateId, template);
      }
    } else if (schemaId) {
      const schemaTmplKey = `tmpl:pub:schema:${orgId}:${schemaId}`;
      template = await this.redisService.get<any>(schemaTmplKey);
      if (!template) {
        // Find published template matching schemaId (Model)
        template = await this.prisma.template.findFirst({
          where: {
            contentTypeId: schemaId,
            orgId,
            OR: [
              { fieldsPublished: { not: null } },
              { bodyPublished: { not: null } },
            ],
          },
          orderBy: { updatedAt: 'desc' },
          include: {
            contentType: {
              select: { id: true, name: true, slug: true, schema: true },
            },
          },
        });

        if (!template) {
          throw new NotFoundException({
            code: 'TEMPLATE_NOT_FOUND',
            message: `No published template found associated with model ${schemaId}`,
          });
        }

        await this.redisService.set(schemaTmplKey, template, 86400);
      }
    }

    // 2. Resolve Content Entry (if contentId provided)
    let contentData: Record<string, any> = {};
    if (contentId) {
      let entry = await this.redisService.getPublishedEntry<any>(contentId);
      if (!entry) {
        entry = await this.prisma.contentEntry.findFirst({
          where: { id: contentId, orgId },
        });

        if (!entry) {
          throw new NotFoundException({
            code: 'CONTENT_NOT_FOUND',
            message: `Content entry ${contentId} not found in this organization`,
          });
        }

        await this.redisService.setPublishedEntry(contentId, entry);
      }

      // In production render pipeline, publishedData is preferred
      const entryData = entry.publishedData ?? entry.data;
      if (entryData && typeof entryData === 'object' && !Array.isArray(entryData)) {
        contentData = entryData as Record<string, any>;
      }
    }

    // 3. Assemble Merged Render Context
    const context: Record<string, any> = {
      ...contentData,
      ...data,
      ...variables,
      entry: contentData,
      data,
      variables,
    };

    // 4. Model-driven Multi-Field Rendering
    const fieldsPublished = template.fieldsPublished as Record<string, any> | null;
    if (fieldsPublished && typeof fieldsPublished === 'object' && Object.keys(fieldsPublished).length > 0) {
      // 0. Normalize dot keys (e.g. seo.meta_title) into nested object (SEC-04: Prototype Pollution Protection)
      const FORBIDDEN_PROPERTIES = new Set(['__proto__', 'constructor', 'prototype']);
      const normalizedFields: Record<string, any> = Object.create(null);
      for (const [k, v] of Object.entries(fieldsPublished)) {
        if (k.includes('.')) {
          const parts = k.split('.');
          if (parts.some((part) => FORBIDDEN_PROPERTIES.has(part))) {
            continue;
          }
          const [parent, child] = parts;
          if (!normalizedFields[parent] || typeof normalizedFields[parent] !== 'object') {
            normalizedFields[parent] = Object.create(null);
          }
          normalizedFields[parent][child] = v;
        } else {
          if (!FORBIDDEN_PROPERTIES.has(k)) {
            normalizedFields[k] = v;
          }
        }
      }

      const renderedFields: Record<string, any> = {};
      const modelFields: any[] = (template.contentType?.schema as any)?.fields || [];
      const allowedFields = modelFields.length > 0 ? new Set(modelFields.map((f: any) => f.name)) : null;

      for (const [key, rawTpl] of Object.entries(normalizedFields)) {
        if (allowedFields && !allowedFields.has(key)) {
          continue;
        }

        // A. Handle structured component template (object of subfield templates)
        let subfieldTemplates: Record<string, any> | null = null;
        if (rawTpl && typeof rawTpl === 'object' && !Array.isArray(rawTpl)) {
          subfieldTemplates = rawTpl as Record<string, any>;
        } else if (typeof rawTpl === 'string' && rawTpl.trim().startsWith('{') && rawTpl.trim().endsWith('}')) {
          try {
            const parsed = JSON.parse(rawTpl);
            if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
              subfieldTemplates = parsed;
            }
          } catch {}
        }

        if (subfieldTemplates) {
          const rawVal = context[key];

          // Check if this is a Dynamic Zone template (contains polymorphic component blocks or marked with __dynamicZone)
          const isDynamicZoneTemplate =
            Boolean(subfieldTemplates.__dynamicZone) ||
            Object.entries(subfieldTemplates).some(
              ([k, v]) => k !== '__dynamicZone' && typeof v === 'object' && v !== null && !Array.isArray(v),
            );

          if (isDynamicZoneTemplate) {
            // Dynamic Zone Evaluation: Each block item has __component matching an allowed component template
            if (Array.isArray(rawVal)) {
              const mappedArray = rawVal.map((item: any, idx: number) => {
                if (!item || typeof item !== 'object') return item;
                const compKey = item.__component || item.component || item._component || item.type;
                let blockTpl: Record<string, any> | null = null;

                if (compKey && subfieldTemplates![compKey] && typeof subfieldTemplates![compKey] === 'object') {
                  blockTpl = subfieldTemplates![compKey];
                } else if (compKey) {
                  for (const [k, v] of Object.entries(subfieldTemplates!)) {
                    if (k !== '__dynamicZone' && typeof v === 'object' && v !== null) {
                      if (k.toLowerCase() === String(compKey).toLowerCase()) {
                        blockTpl = v as Record<string, any>;
                        break;
                      }
                    }
                  }
                }

                if (!blockTpl) {
                  return item;
                }

                const itemObj: Record<string, any> = {
                  __component: compKey || item.__component || 'block',
                };
                const itemScope = { ...context, ...item, this: item, '@index': idx };

                for (const [subKey, subFormula] of Object.entries(blockTpl)) {
                  if (subKey === '__dynamicZone') continue;
                  if (typeof subFormula === 'string') {
                    const subTrimmed = subFormula.trim();
                    if (
                      (subTrimmed === '' ||
                        subTrimmed === `{{${subKey}}}` ||
                        subTrimmed === `{{this.${subKey}}}`) &&
                      item[subKey] !== undefined
                    ) {
                      itemObj[subKey] = item[subKey];
                    } else {
                      let val: any = this.handlebarsService.render(subFormula, itemScope);
                      if (
                        typeof val === 'string' &&
                        ((val.startsWith('{') && val.endsWith('}')) || (val.startsWith('[') && val.endsWith(']')))
                      ) {
                        try {
                          val = JSON.parse(val);
                        } catch {}
                      }
                      itemObj[subKey] = val;
                    }
                  } else {
                    itemObj[subKey] = subFormula;
                  }
                }
                return itemObj;
              });

              renderedFields[key] = mappedArray;
              continue;
            }

            if (typeof rawVal === 'object' && rawVal !== null && !Array.isArray(rawVal)) {
              const compKey = rawVal.__component || rawVal.component || rawVal._component || rawVal.type;
              let blockTpl: Record<string, any> | null = null;
              if (compKey && subfieldTemplates[compKey] && typeof subfieldTemplates[compKey] === 'object') {
                blockTpl = subfieldTemplates[compKey];
              }

              if (blockTpl) {
                const itemObj: Record<string, any> = {
                  __component: compKey || 'block',
                };
                const scope = { ...context, ...rawVal, this: rawVal };
                for (const [subKey, subFormula] of Object.entries(blockTpl)) {
                  if (subKey === '__dynamicZone') continue;
                  if (typeof subFormula === 'string') {
                    const subTrimmed = subFormula.trim();
                    if (
                      (subTrimmed === '' ||
                        subTrimmed === `{{${subKey}}}` ||
                        subTrimmed === `{{this.${subKey}}}`) &&
                      rawVal[subKey] !== undefined
                    ) {
                      itemObj[subKey] = rawVal[subKey];
                    } else {
                      let val: any = this.handlebarsService.render(subFormula, scope);
                      itemObj[subKey] = val;
                    }
                  } else {
                    itemObj[subKey] = subFormula;
                  }
                }
                renderedFields[key] = itemObj;
                continue;
              }
              renderedFields[key] = rawVal;
              continue;
            }

            renderedFields[key] = [];
            continue;
          }

          // 1. If user passed a JSON array for this component -> component output is an array!
          if (Array.isArray(rawVal)) {
            const mappedArray = rawVal.map((item: any, idx: number) => {
              const itemObj: Record<string, any> = {};
              const itemScope =
                typeof item === 'object' && item !== null
                  ? { ...context, ...item, this: item, '@index': idx }
                  : { ...context, this: item, '@index': idx };

              for (const [subKey, subFormula] of Object.entries(subfieldTemplates!)) {
                if (typeof subFormula === 'string') {
                  const subTrimmed = subFormula.trim();
                  if (
                    (subTrimmed === '' ||
                      subTrimmed === `{{${subKey}}}` ||
                      subTrimmed === `{{this.${subKey}}}`) &&
                    typeof item === 'object' &&
                    item !== null &&
                    item[subKey] !== undefined
                  ) {
                    itemObj[subKey] = item[subKey];
                  } else {
                    let val: any = this.handlebarsService.render(subFormula, itemScope);
                    if (
                      typeof val === 'string' &&
                      ((val.startsWith('{') && val.endsWith('}')) || (val.startsWith('[') && val.endsWith(']')))
                    ) {
                      try {
                        val = JSON.parse(val);
                      } catch {}
                    }
                    itemObj[subKey] = val;
                  }
                } else {
                  itemObj[subKey] = subFormula;
                }
              }
              return itemObj;
            });

            renderedFields[key] = mappedArray;
            continue;
          }

          // 2. If user passed a single JSON object for this component
          if (typeof rawVal === 'object' && rawVal !== null && !Array.isArray(rawVal)) {
            const itemObj: Record<string, any> = {};
            const scope = { ...context, ...rawVal, this: rawVal };

            for (const [subKey, subFormula] of Object.entries(subfieldTemplates)) {
              if (typeof subFormula === 'string') {
                const subTrimmed = subFormula.trim();
                if (
                  (subTrimmed === '' ||
                    subTrimmed === `{{${subKey}}}` ||
                    subTrimmed === `{{this.${subKey}}}`) &&
                  rawVal[subKey] !== undefined
                ) {
                  itemObj[subKey] = rawVal[subKey];
                } else {
                  let val: any = this.handlebarsService.render(subFormula, scope);
                  if (
                    typeof val === 'string' &&
                    ((val.startsWith('{') && val.endsWith('}')) || (val.startsWith('[') && val.endsWith(']')))
                  ) {
                    try {
                      val = JSON.parse(val);
                    } catch {}
                  }
                  itemObj[subKey] = val;
                }
              } else {
                itemObj[subKey] = subFormula;
              }
            }

            renderedFields[key] = itemObj;
            continue;
          }

          // 3. Fallback: evaluate default subfield expressions with context
          const itemObj: Record<string, any> = {};
          for (const [subKey, subFormula] of Object.entries(subfieldTemplates)) {
            itemObj[subKey] =
              typeof subFormula === 'string'
                ? this.handlebarsService.render(subFormula, context)
                : subFormula;
          }
          renderedFields[key] = itemObj;
          continue;
        }

        // B. Handle regular string or primitive templates
        const trimmed = typeof rawTpl === 'string' ? rawTpl.trim() : '';

        // 1. Direct pass-through if template expression is {{key}} or {{{key}}} or empty
        if (
          (trimmed === `{{${key}}}` || trimmed === `{{{${key}}}}` || trimmed === '') &&
          context[key] !== undefined
        ) {
          renderedFields[key] = context[key];
          continue;
        }

        // 2. Render via Handlebars
        let renderedVal: any = this.handlebarsService.render(typeof rawTpl === 'string' ? rawTpl : '', context);

        // 3. Graceful fallback: If Handlebars produced "[object Object]" and original input was an object/array, preserve original
        if (
          typeof renderedVal === 'string' &&
          renderedVal.includes('[object Object]') &&
          context[key] !== undefined &&
          typeof context[key] === 'object'
        ) {
          renderedFields[key] = context[key];
          continue;
        }

        // 4. Auto-parse JSON string outputs (e.g. from {{{json field}}})
        if (typeof renderedVal === 'string') {
          const s = renderedVal.trim();
          if (
            (s.startsWith('{') && s.endsWith('}')) ||
            (s.startsWith('[') && s.endsWith(']'))
          ) {
            try {
              renderedVal = JSON.parse(s);
            } catch {
              // keep as rendered string
            }
          }
        }

        renderedFields[key] = renderedVal;
      }

      return {
        type: template.type,
        data: renderedFields,
        output: renderedFields,
        model: template.contentType
          ? {
              id: template.contentType.id,
              name: template.contentType.name,
              slug: template.contentType.slug,
            }
          : null,
        template: {
          id: template.id,
          name: template.name,
        },
        subject: renderedFields.subject || renderedFields.sub || '',
        body: renderedFields.body || renderedFields.html || '',
        html: renderedFields.html || renderedFields.body || '',
      } as any;
    }

    // 5. Fallback Legacy Render
    const templateSource = template.bodyPublished || '';
    const renderedBody = this.handlebarsService.render(templateSource, context);

    switch (template.type) {
      case 'EMAIL': {
        let subject = template.name;
        if (template.subjectPublished) {
          subject = this.handlebarsService.render(template.subjectPublished, context);
        }
        return {
          type: 'EMAIL',
          subject,
          body: renderedBody,
          data: { subject, body: renderedBody },
          output: { subject, body: renderedBody },
          model: template.contentType
            ? {
                id: template.contentType.id,
                name: template.contentType.name,
                slug: template.contentType.slug,
              }
            : null,
          template: {
            id: template.id,
            name: template.name,
          },
        } as any;
      }

      case 'HTML_PAGE': {
        return {
          type: 'HTML_PAGE',
          html: renderedBody,
          data: { html: renderedBody },
          output: { html: renderedBody },
          model: template.contentType
            ? {
                id: template.contentType.id,
                name: template.contentType.name,
                slug: template.contentType.slug,
              }
            : null,
          template: {
            id: template.id,
            name: template.name,
          },
        } as any;
      }

      case 'JSON': {
        let parsed: any;
        try {
          parsed = JSON.parse(renderedBody);
        } catch {
          parsed = { raw: renderedBody };
        }
        return {
          type: 'JSON',
          payload: parsed,
          data: parsed,
          output: parsed,
          model: template.contentType
            ? {
                id: template.contentType.id,
                name: template.contentType.name,
                slug: template.contentType.slug,
              }
            : null,
          template: {
            id: template.id,
            name: template.name,
          },
        } as any;
      }

      default: {
        return {
          type: 'CUSTOM',
          data: { body: renderedBody },
          output: { body: renderedBody },
          html: renderedBody,
          body: renderedBody,
          model: template.contentType
            ? {
                id: template.contentType.id,
                name: template.contentType.name,
                slug: template.contentType.slug,
              }
            : null,
          template: {
            id: template.id,
            name: template.name,
          },
        } as any;
      }
    }
  }
}
