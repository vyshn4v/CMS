import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HandlebarsService } from './handlebars.service';
import {
  CreateTemplateInput,
  UpdateTemplateInput,
  PreviewTemplateInput,
  TemplateType,
  TemplateListResponse,
  RenderOutputData,
} from '@cms/shared-types';

/**
 * Service managing template persistence, versioning (draft/published), and preview rendering.
 */
@Injectable()
export class TemplateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly handlebarsService: HandlebarsService,
  ) {}

  /**
   * Retrieves a paginated list of templates with optional filters.
   */
  async findAll(
    orgId: string,
    query: {
      type?: TemplateType;
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<TemplateListResponse> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = { orgId };

    if (query.type) {
      where.type = query.type;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    const [total, items] = await Promise.all([
      this.prisma.template.count({ where }),
      this.prisma.template.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          contentType: {
            select: { id: true, name: true, slug: true },
          },
        },
      }),
    ]);

    return {
      items: items as any,
      total,
      page,
      limit,
    };
  }

  /**
   * Fetches a single template by ID within an organization.
   */
  async findOne(orgId: string, id: string) {
    const template = await this.prisma.template.findFirst({
      where: { id, orgId },
      include: {
        contentType: {
          select: { id: true, name: true, slug: true, schema: true },
        },
      },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID '${id}' not found`);
    }

    return template;
  }

  /**
   * Creates a new template. Optionally publishes it immediately if `publish: true`.
   */
  async create(orgId: string, input: CreateTemplateInput) {
    if (!input.name || !input.name.trim()) {
      throw new BadRequestException('Template name is required');
    }

    // Verify Handlebars syntax before storing
    this.handlebarsService.compile(input.bodyDraft || '');
    if (input.type === 'EMAIL' && input.subjectDraft) {
      this.handlebarsService.compile(input.subjectDraft);
    }

    // Verify contentType association if provided
    if (input.contentTypeId) {
      const contentType = await this.prisma.contentType.findFirst({
        where: { id: input.contentTypeId, orgId },
      });
      if (!contentType) {
        throw new NotFoundException(`Content type with ID '${input.contentTypeId}' not found`);
      }
    }

    const shouldPublish = Boolean(input.publish);

    const template = await this.prisma.template.create({
      data: {
        org: { connect: { id: orgId } },
        name: input.name.trim(),
        type: input.type || 'EMAIL',
        bodyDraft: input.bodyDraft || '',
        subjectDraft: input.subjectDraft || null,
        status: shouldPublish ? 'PUBLISHED' : 'DRAFT',
        bodyPublished: shouldPublish ? input.bodyDraft || '' : null,
        subjectPublished: shouldPublish ? input.subjectDraft || null : null,
        publishedAt: shouldPublish ? new Date() : null,
        ...(input.contentTypeId ? { contentType: { connect: { id: input.contentTypeId } } } : {}),
      },
      include: {
        contentType: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    return template;
  }

  /**
   * Updates template draft content and metadata.
   */
  async update(orgId: string, id: string, input: UpdateTemplateInput) {
    await this.findOne(orgId, id);

    // Validate Handlebars syntax if body or subject are provided
    if (input.bodyDraft !== undefined) {
      this.handlebarsService.compile(input.bodyDraft);
    }
    if (input.subjectDraft !== undefined && input.subjectDraft !== null) {
      this.handlebarsService.compile(input.subjectDraft);
    }

    // Verify contentType association if provided
    if (input.contentTypeId) {
      const contentType = await this.prisma.contentType.findFirst({
        where: { id: input.contentTypeId, orgId },
      });
      if (!contentType) {
        throw new NotFoundException(`Content type with ID '${input.contentTypeId}' not found`);
      }
    }

    const data: any = {};
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.type !== undefined) data.type = input.type;
    if (input.bodyDraft !== undefined) data.bodyDraft = input.bodyDraft;
    if (input.subjectDraft !== undefined) data.subjectDraft = input.subjectDraft;
    if (input.contentTypeId !== undefined) {
      data.contentType = input.contentTypeId ? { connect: { id: input.contentTypeId } } : { disconnect: true };
    }

    const updated = await this.prisma.template.update({
      where: { id },
      data,
      include: {
        contentType: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    return updated;
  }

  /**
   * Publishes the template, creating an immutable published snapshot of body and subject.
   */
  async publish(
    orgId: string,
    id: string,
    optionalDraftUpdates?: { bodyDraft?: string; subjectDraft?: string; name?: string },
  ) {
    const template = await this.findOne(orgId, id);

    const bodyToPublish = optionalDraftUpdates?.bodyDraft !== undefined
      ? optionalDraftUpdates.bodyDraft
      : template.bodyDraft;

    const subjectToPublish = optionalDraftUpdates?.subjectDraft !== undefined
      ? optionalDraftUpdates.subjectDraft
      : template.subjectDraft;

    // Validate syntax before publishing
    this.handlebarsService.compile(bodyToPublish || '');
    if (template.type === 'EMAIL' && subjectToPublish) {
      this.handlebarsService.compile(subjectToPublish);
    }

    const updateData: any = {
      bodyDraft: bodyToPublish,
      subjectDraft: subjectToPublish,
      bodyPublished: bodyToPublish,
      subjectPublished: subjectToPublish,
      status: 'PUBLISHED',
      publishedAt: new Date(),
    };

    if (optionalDraftUpdates?.name) {
      updateData.name = optionalDraftUpdates.name.trim();
    }

    return this.prisma.template.update({
      where: { id },
      data: updateData,
      include: {
        contentType: {
          select: { id: true, name: true, slug: true },
        },
      },
    });
  }

  /**
   * Unpublishes a template, changing status back to DRAFT without deleting published content.
   */
  async unpublish(orgId: string, id: string) {
    await this.findOne(orgId, id);

    return this.prisma.template.update({
      where: { id },
      data: {
        status: 'DRAFT',
      },
      include: {
        contentType: {
          select: { id: true, name: true, slug: true },
        },
      },
    });
  }

  /**
   * Deletes a template.
   */
  async remove(orgId: string, id: string) {
    await this.findOne(orgId, id);
    return this.prisma.template.delete({ where: { id } });
  }

  /**
   * Previews a template render using mock variables or a real content entry.
   * If `id` is provided, fetches the template. Allows client to override `body` / `subject` to preview in-memory draft changes.
   */
  async preview(
    orgId: string,
    id: string | null,
    input: PreviewTemplateInput,
    rawTemplateType: TemplateType = 'EMAIL',
  ): Promise<RenderOutputData> {
    let templateType = rawTemplateType;
    let bodySource = input.body || '';
    let subjectSource = input.subject || '';

    if (id) {
      const template = await this.findOne(orgId, id);
      templateType = template.type;
      bodySource = input.body !== undefined ? input.body : template.bodyDraft;
      subjectSource = input.subject !== undefined ? input.subject : (template.subjectDraft || '');
    }

    // Assemble render context
    let contextData: Record<string, any> = { ...(input.variables || {}) };

    if (input.contentId) {
      const entry = await this.prisma.contentEntry.findFirst({
        where: { id: input.contentId, orgId },
      });
      if (entry) {
        const entryPayload = (entry.publishedData as Record<string, any>) || (entry.data as Record<string, any>) || {};
        contextData = { ...entryPayload, ...contextData };
      }
    }

    // Render body
    const renderedBody = this.handlebarsService.render(bodySource, contextData);

    switch (templateType) {
      case 'EMAIL': {
        const renderedSubject = subjectSource
          ? this.handlebarsService.render(subjectSource, contextData)
          : '';
        return {
          type: 'EMAIL',
          subject: renderedSubject,
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
        let parsed: any;
        try {
          parsed = JSON.parse(renderedBody);
        } catch {
          parsed = { raw: renderedBody };
        }
        return {
          type: 'JSON',
          payload: parsed,
        };
      }
      default:
        return {
          type: 'HTML_PAGE',
          html: renderedBody,
        };
    }
  }
}
