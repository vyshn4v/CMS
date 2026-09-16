import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HandlebarsService } from '../template/handlebars.service';
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
    let template;
    if (templateId) {
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
    } else if (schemaId) {
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
    }

    // 2. Resolve Content Entry (if contentId provided)
    let contentData: Record<string, any> = {};
    if (contentId) {
      const entry = await this.prisma.contentEntry.findFirst({
        where: { id: contentId, orgId },
      });

      if (!entry) {
        throw new NotFoundException({
          code: 'CONTENT_NOT_FOUND',
          message: `Content entry ${contentId} not found in this organization`,
        });
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
    const fieldsPublished = template.fieldsPublished as Record<string, string> | null;
    if (fieldsPublished && typeof fieldsPublished === 'object' && Object.keys(fieldsPublished).length > 0) {
      const renderedFields: Record<string, any> = {};
      const modelFields: any[] = (template.contentType?.schema as any)?.fields || [];
      const allowedFields = modelFields.length > 0 ? new Set(modelFields.map((f: any) => f.name)) : null;

      for (const [key, rawTpl] of Object.entries(fieldsPublished)) {
        if (!allowedFields || allowedFields.has(key)) {
          renderedFields[key] = this.handlebarsService.render(rawTpl || '', context);
        }
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
