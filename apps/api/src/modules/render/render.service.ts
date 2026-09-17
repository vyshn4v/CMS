import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HandlebarsService } from '../template/handlebars.service';
import { TemplateEngineService } from '../template/template-engine.service';
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
    private readonly templateEngineService: TemplateEngineService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Main render method executing the CMS rendering pipeline for an organization.
   */
  async render(orgId: string, request: RenderRequest): Promise<RenderData> {
    const { schemaId, templateId, contentId, data = {}, variables = {} } = request;

    if (!contentId) {
      if (!templateId && !schemaId) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message:
            'At least one of "templateId", "schemaId", or "contentId" must be provided to render',
        });
      }
      if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message:
            'The "data" payload is required when rendering with "templateId" or "schemaId" without a "contentId", as the template requires field values to map.',
        });
      }
    }

    // 1. Resolve Content Entry (if contentId provided)
    let contentData: Record<string, any> = {};
    let entry: any = null;
    if (contentId) {
      entry = await this.redisService.getPublishedEntry<any>(contentId);
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

      if (schemaId && entry && entry.contentTypeId !== schemaId) {
        throw new BadRequestException({
          code: 'SCHEMA_MISMATCH',
          message: `Content entry ${contentId} does not belong to model ${schemaId}`,
        });
      }

      // In production render pipeline, publishedData is preferred
      const entryData = entry.publishedData ?? entry.data;
      if (entryData && typeof entryData === 'object' && !Array.isArray(entryData)) {
        contentData = entryData as Record<string, any>;
      }
    }

    // 2. Resolve Target Template
    const effectiveSchemaId = schemaId || entry?.contentTypeId || null;
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
    } else if (effectiveSchemaId) {
      const schemaTmplKey = `tmpl:pub:schema:${orgId}:${effectiveSchemaId}`;
      template = await this.redisService.get<any>(schemaTmplKey);
      if (!template) {
        // Find published template matching schemaId / model
        template = await this.prisma.template.findFirst({
          where: {
            contentTypeId: effectiveSchemaId,
            orgId,
            OR: [{ fieldsPublished: { not: null } }, { bodyPublished: { not: null } }],
          },
          orderBy: { updatedAt: 'desc' },
          include: {
            contentType: {
              select: { id: true, name: true, slug: true, schema: true },
            },
          },
        });

        if (template) {
          await this.redisService.set(schemaTmplKey, template, 86400);
        }
      }
    }

    // If no template exists for this model/entry, gracefully return the raw content entry or data as pass-through
    if (!template) {
      if (contentId) {
        const resObj: any = {
          type: 'CUSTOM',
          output: contentData,
        };
        Object.defineProperty(resObj, 'data', {
          get: () => contentData,
          enumerable: false,
          configurable: true,
        });
        return resObj;
      }

      if (effectiveSchemaId) {
        throw new NotFoundException({
          code: 'TEMPLATE_NOT_FOUND',
          message: `No published template found associated with model ${effectiveSchemaId}`,
        });
      }
    }

    // 3. Assemble Merged Render Context
    // If contentId is supplied, stored contentData is authoritative and takes strict precedence over ad-hoc data.
    const context: Record<string, any> = contentId
      ? {
          ...data,
          ...contentData,
          ...variables,
          entry: contentData,
          data: { ...data, ...contentData },
          variables,
        }
      : {
          ...data,
          ...variables,
          data,
          variables,
        };

    // 4. Model-driven Multi-Field Rendering
    const fieldsPublished = template.fieldsPublished as Record<string, any> | null;
    if (
      fieldsPublished &&
      typeof fieldsPublished === 'object' &&
      Object.keys(fieldsPublished).length > 0
    ) {
      const renderedFields = this.templateEngineService.renderModelFields({
        fields: fieldsPublished,
        context,
        modelFields: (template.contentType?.schema as any)?.fields || [],
        fallbackDrafts: template.fieldsDraft as any,
      });

      const resObj: any = {
        type: template.type,
        output: renderedFields,
      };
      Object.defineProperty(resObj, 'data', {
        get: () => renderedFields,
        enumerable: false,
        configurable: true,
      });
      return resObj;
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
        const output = { subject, body: renderedBody };
        const resObj: any = {
          type: 'EMAIL',
          output,
        };
        Object.defineProperty(resObj, 'data', {
          get: () => output,
          enumerable: false,
          configurable: true,
        });
        return resObj;
      }

      case 'HTML_PAGE': {
        const output = { html: renderedBody };
        const resObj: any = {
          type: 'HTML_PAGE',
          output,
        };
        Object.defineProperty(resObj, 'data', {
          get: () => output,
          enumerable: false,
          configurable: true,
        });
        return resObj;
      }

      case 'JSON': {
        let parsed: any;
        try {
          parsed = JSON.parse(renderedBody);
        } catch {
          parsed = { raw: renderedBody };
        }
        const resObj: any = {
          type: 'JSON',
          output: parsed,
        };
        Object.defineProperty(resObj, 'data', {
          get: () => parsed,
          enumerable: false,
          configurable: true,
        });
        return resObj;
      }

      default: {
        const output = { body: renderedBody };
        const resObj: any = {
          type: 'CUSTOM',
          output,
        };
        Object.defineProperty(resObj, 'data', {
          get: () => output,
          enumerable: false,
          configurable: true,
        });
        return resObj;
      }
    }
  }
}
