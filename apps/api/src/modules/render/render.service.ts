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
      });

      if (!template) {
        throw new NotFoundException({
          code: 'TEMPLATE_NOT_FOUND',
          message: `Template ${templateId} not found in this organization`,
        });
      }

      if (!template.bodyPublished) {
        throw new BadRequestException({
          code: 'TEMPLATE_NOT_PUBLISHED',
          message: `Template "${template.name}" has no published version to render`,
        });
      }
    } else if (schemaId) {
      // Find published template matching schemaId
      template = await this.prisma.template.findFirst({
        where: {
          contentTypeId: schemaId,
          orgId,
          bodyPublished: { not: null },
        },
        orderBy: { updatedAt: 'desc' },
      });

      if (!template) {
        throw new NotFoundException({
          code: 'TEMPLATE_NOT_FOUND',
          message: `No published template found associated with schema ${schemaId}`,
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

    // 4. Execute Handlebars Render
    const templateSource = template.bodyPublished || '';
    const renderedBody = this.handlebarsService.render(templateSource, context);

    // 5. Structure Output by Template Type
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
        };
      }

      case 'HTML_PAGE': {
        return {
          type: 'HTML_PAGE',
          html: renderedBody,
        };
      }

      case 'JSON': {
        try {
          const parsed = JSON.parse(renderedBody);
          return {
            type: 'JSON',
            payload: parsed,
          };
        } catch {
          return {
            type: 'JSON',
            payload: renderedBody,
          };
        }
      }

      default: {
        return {
          type: 'HTML_PAGE',
          html: renderedBody,
        };
      }
    }
  }
}
