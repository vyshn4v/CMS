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
      contentTypeId?: string;
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
    if (query.contentTypeId) {
      where.contentTypeId = query.contentTypeId;
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
  /**
   * Creates a new template. Optionally publishes it immediately if `publish: true`.
   */
  async create(orgId: string, input: CreateTemplateInput) {
    if (!input.name || !input.name.trim()) {
      throw new BadRequestException('Template name is required');
    }

    if (!input.contentTypeId) {
      throw new BadRequestException('A target Model (contentTypeId) is required for all templates');
    }

    const contentType = await this.prisma.contentType.findFirst({
      where: { id: input.contentTypeId, orgId },
    });
    if (!contentType) {
      throw new NotFoundException(`Content type with ID '${input.contentTypeId}' not found`);
    }

    let fieldsDraft = input.fieldsDraft || null;
    if (fieldsDraft && typeof fieldsDraft === 'object') {
      const allowedFields = new Set(
        ((contentType.schema as any)?.fields || []).map((f: any) => f.name),
      );
      if (allowedFields.size > 0) {
        const cleanFields: Record<string, string> = {};
        for (const [key, val] of Object.entries(fieldsDraft)) {
          if (allowedFields.has(key)) {
            cleanFields[key] = val;
          }
        }
        fieldsDraft = cleanFields;
      }

      for (const [key, val] of Object.entries(fieldsDraft)) {
        if (typeof val === 'string') {
          this.handlebarsService.compile(val);
        }
      }
    } else {
      this.handlebarsService.compile(input.bodyDraft || '');
      if (input.type === 'EMAIL' && input.subjectDraft) {
        this.handlebarsService.compile(input.subjectDraft);
      }
    }

    const shouldPublish = Boolean(input.publish);
    const bodyDraft =
      input.bodyDraft ||
      (fieldsDraft ? fieldsDraft.body || fieldsDraft.html || JSON.stringify(fieldsDraft) : '');
    const subjectDraft =
      input.subjectDraft ||
      (fieldsDraft ? fieldsDraft.subject || fieldsDraft.sub || null : null);

    const template = await this.prisma.template.create({
      data: {
        org: { connect: { id: orgId } },
        name: input.name.trim(),
        type: input.type || 'CUSTOM',
        fieldsDraft: fieldsDraft as any,
        fieldsPublished: shouldPublish ? (fieldsDraft as any) : null,
        bodyDraft,
        subjectDraft,
        status: shouldPublish ? 'PUBLISHED' : 'DRAFT',
        bodyPublished: shouldPublish ? bodyDraft : null,
        subjectPublished: shouldPublish ? subjectDraft : null,
        publishedAt: shouldPublish ? new Date() : null,
        contentType: { connect: { id: input.contentTypeId } },
      },
      include: {
        contentType: {
          select: { id: true, name: true, slug: true, schema: true },
        },
      },
    });

    return template;
  }

  /**
   * Updates template draft content and metadata.
   */
  async update(orgId: string, id: string, input: UpdateTemplateInput) {
    const existing = await this.findOne(orgId, id);

    let fieldsDraft = input.fieldsDraft;
    const targetContentTypeId = input.contentTypeId || existing.contentTypeId;

    if (targetContentTypeId) {
      const contentType = await this.prisma.contentType.findFirst({
        where: { id: targetContentTypeId, orgId },
      });
      if (!contentType) {
        throw new NotFoundException(`Content type with ID '${targetContentTypeId}' not found`);
      }
      if (fieldsDraft && typeof fieldsDraft === 'object') {
        const allowedFields = new Set(
          ((contentType.schema as any)?.fields || []).map((f: any) => f.name),
        );
        if (allowedFields.size > 0) {
          const cleanFields: Record<string, string> = {};
          for (const [key, val] of Object.entries(fieldsDraft)) {
            if (allowedFields.has(key)) {
              cleanFields[key] = val;
            }
          }
          fieldsDraft = cleanFields;
        }
      }
    }

    if (fieldsDraft && typeof fieldsDraft === 'object') {
      for (const [key, val] of Object.entries(fieldsDraft)) {
        if (typeof val === 'string') {
          this.handlebarsService.compile(val);
        }
      }
    }

    if (input.bodyDraft !== undefined) {
      this.handlebarsService.compile(input.bodyDraft);
    }
    if (input.subjectDraft !== undefined && input.subjectDraft !== null) {
      this.handlebarsService.compile(input.subjectDraft);
    }

    const data: any = {};
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.type !== undefined) data.type = input.type;
    if (fieldsDraft !== undefined) {
      data.fieldsDraft = fieldsDraft;
      if (fieldsDraft.body || fieldsDraft.html) {
        data.bodyDraft = fieldsDraft.body || fieldsDraft.html;
      }
      if (fieldsDraft.subject || fieldsDraft.sub) {
        data.subjectDraft = fieldsDraft.subject || fieldsDraft.sub;
      }
    }
    if (input.bodyDraft !== undefined && !data.bodyDraft) data.bodyDraft = input.bodyDraft;
    if (input.subjectDraft !== undefined && !data.subjectDraft) data.subjectDraft = input.subjectDraft;
    if (input.contentTypeId !== undefined) {
      data.contentType = input.contentTypeId ? { connect: { id: input.contentTypeId } } : { disconnect: true };
    }

    const updated = await this.prisma.template.update({
      where: { id },
      data,
      include: {
        contentType: {
          select: { id: true, name: true, slug: true, schema: true },
        },
      },
    });

    return updated;
  }

  /**
   * Publishes the template, creating an immutable published snapshot of body, subject, and fields.
   */
  async publish(
    orgId: string,
    id: string,
    optionalDraftUpdates?: {
      bodyDraft?: string;
      subjectDraft?: string;
      name?: string;
      fieldsDraft?: Record<string, string>;
    },
  ) {
    const template = await this.findOne(orgId, id);

    let fieldsToPublish =
      optionalDraftUpdates?.fieldsDraft !== undefined
        ? optionalDraftUpdates.fieldsDraft
        : (template.fieldsDraft as Record<string, string> | null);

    if (template.contentType?.schema && fieldsToPublish && typeof fieldsToPublish === 'object') {
      const allowedFields = new Set(
        ((template.contentType.schema as any)?.fields || []).map((f: any) => f.name),
      );
      if (allowedFields.size > 0) {
        const cleanFields: Record<string, string> = {};
        for (const [k, v] of Object.entries(fieldsToPublish)) {
          if (allowedFields.has(k)) {
            cleanFields[k] = v;
          }
        }
        fieldsToPublish = cleanFields;
      }
    }

    if (fieldsToPublish && typeof fieldsToPublish === 'object') {
      for (const [_, val] of Object.entries(fieldsToPublish)) {
        if (typeof val === 'string') {
          this.handlebarsService.compile(val);
        }
      }
    }

    const bodyToPublish =
      optionalDraftUpdates?.bodyDraft !== undefined
        ? optionalDraftUpdates.bodyDraft
        : fieldsToPublish?.body || fieldsToPublish?.html || template.bodyDraft;

    const subjectToPublish =
      optionalDraftUpdates?.subjectDraft !== undefined
        ? optionalDraftUpdates.subjectDraft
        : fieldsToPublish?.subject || fieldsToPublish?.sub || template.subjectDraft;

    this.handlebarsService.compile(bodyToPublish || '');
    if (subjectToPublish) {
      this.handlebarsService.compile(subjectToPublish);
    }

    const updateData: any = {
      fieldsDraft: fieldsToPublish as any,
      fieldsPublished: fieldsToPublish as any,
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
          select: { id: true, name: true, slug: true, schema: true },
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
          select: { id: true, name: true, slug: true, schema: true },
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
   * If `id` is provided, fetches the template. Allows client to override `fieldsDraft` / `body` / `subject` to preview in-memory draft changes.
   */
  async preview(
    orgId: string,
    id: string | null,
    input: PreviewTemplateInput,
    rawTemplateType: TemplateType = 'CUSTOM',
  ): Promise<RenderOutputData> {
    let templateType = input.type || rawTemplateType;
    let fieldsSource: Record<string, string> | null = input.fieldsDraft || input.fields || null;
    let bodySource = input.body;
    let subjectSource = input.subject;
    let contentType: any = null;

    if (id) {
      const template = await this.findOne(orgId, id);
      templateType = input.type || template.type;
      contentType = template.contentType;
      if (!fieldsSource && template.fieldsDraft) {
        fieldsSource = template.fieldsDraft as Record<string, string>;
      }
      if (bodySource === undefined) bodySource = template.bodyDraft;
      if (subjectSource === undefined) subjectSource = template.subjectDraft || '';
    }

    if (!contentType && (input as any).contentTypeId) {
      contentType = await this.prisma.contentType.findFirst({
        where: { id: (input as any).contentTypeId, orgId },
      });
    }

    if (contentType?.schema && fieldsSource && typeof fieldsSource === 'object') {
      const allowedFields = new Set(
        ((contentType.schema as any)?.fields || []).map((f: any) => f.name),
      );
      if (allowedFields.size > 0) {
        const cleanFields: Record<string, string> = {};
        for (const [k, v] of Object.entries(fieldsSource)) {
          if (allowedFields.has(k)) {
            cleanFields[k] = v;
          }
        }
        fieldsSource = cleanFields;
      }
    }

    // Assemble render context
    let contextData: Record<string, any> = { ...(input.variables || {}) };

    if (input.contentId) {
      const entry = await this.prisma.contentEntry.findFirst({
        where: { id: input.contentId, orgId },
      });
      if (entry) {
        const entryPayload =
          (entry.publishedData as Record<string, any>) ||
          (entry.data as Record<string, any>) ||
          {};
        contextData = { ...entryPayload, ...contextData };
      }
    }

    // If we have field-by-field model output mappings:
    if (fieldsSource && typeof fieldsSource === 'object' && Object.keys(fieldsSource).length > 0) {
      const renderedFields: Record<string, any> = {};
      for (const [key, rawTpl] of Object.entries(fieldsSource)) {
        renderedFields[key] = this.handlebarsService.render(rawTpl || '', contextData);
      }

      return {
        type: templateType,
        data: renderedFields,
        output: renderedFields,
        model: contentType
          ? { id: contentType.id, name: contentType.name, slug: contentType.slug }
          : null,
        subject: renderedFields.subject || renderedFields.sub || '',
        body: renderedFields.body || renderedFields.html || '',
        html: renderedFields.html || renderedFields.body || '',
      };
    }

    // Fallback to legacy single-template preview:
    const renderedBody = this.handlebarsService.render(bodySource || '', contextData);
    const renderedSubject = subjectSource
      ? this.handlebarsService.render(subjectSource, contextData)
      : '';

    return {
      type: templateType,
      data: {
        ...(renderedSubject ? { subject: renderedSubject } : {}),
        body: renderedBody,
      },
      output: {
        ...(renderedSubject ? { subject: renderedSubject } : {}),
        body: renderedBody,
      },
      subject: renderedSubject,
      body: renderedBody,
      html: renderedBody,
    };
  }
}
