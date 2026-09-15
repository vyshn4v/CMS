import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ContentEntryDto,
  CreateEntryInput,
  UpdateEntryInput,
  ContentEntryListResponse,
  ContentQueryOptions,
  SchemaDefinition,
} from '@cms/shared-types';
import { validateEntryData } from '../schema/validators/zod-builder';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Service managing content entries, dynamic Zod validation, and draft/publish workflow.
 */
@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to resolve a ContentType either by slug or by schemaId (UUID).
   */
  async resolveContentType(orgId: string, slugOrId: string) {
    let contentType = null;

    if (UUID_REGEX.test(slugOrId)) {
      contentType = await this.prisma.contentType.findFirst({
        where: { id: slugOrId, orgId },
      });
    }

    if (!contentType) {
      contentType = await this.prisma.contentType.findFirst({
        where: { slug: slugOrId, orgId },
      });
    }

    if (!contentType) {
      throw new NotFoundException(`Content model '${slugOrId}' was not found`);
    }

    return contentType;
  }

  /**
   * List paginated content entries for a specific schema/slug with optional status filter and sorting.
   */
  async listEntries(
    orgId: string,
    slugOrId: string,
    options: ContentQueryOptions = {},
  ): Promise<ContentEntryListResponse> {
    const contentType = await this.resolveContentType(orgId, slugOrId);

    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      contentTypeId: contentType.id,
      orgId,
    };

    if (options.status) {
      where.status = options.status;
    }

    // Determine sort order
    let orderBy: any = { createdAt: 'desc' };
    if (options.sort) {
      const [field, direction] = options.sort.split(':');
      const dir = direction?.toLowerCase() === 'asc' ? 'asc' : 'desc';
      if (field === 'updatedAt' || field === 'updated_at') {
        orderBy = { updatedAt: dir };
      } else if (field === 'createdAt' || field === 'created_at') {
        orderBy = { createdAt: dir };
      } else if (field === 'status') {
        orderBy = { status: dir };
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.contentEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      }),
      this.prisma.contentEntry.count({ where }),
    ]);

    const formatted: ContentEntryDto[] = items.map((item) => ({
      id: item.id,
      contentTypeId: item.contentTypeId,
      orgId: item.orgId,
      createdById: item.createdById,
      createdBy: item.createdBy,
      status: item.status as any,
      data: (item.data as Record<string, any>) || {},
      publishedData: item.publishedData as Record<string, any> | null,
      publishedAt: item.publishedAt ? item.publishedAt.toISOString() : null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    }));

    return {
      items: formatted,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Retrieve a single content entry by ID.
   */
  async getEntryById(
    orgId: string,
    slugOrId: string,
    id: string,
  ): Promise<ContentEntryDto> {
    const contentType = await this.resolveContentType(orgId, slugOrId);

    const entry = await this.prisma.contentEntry.findFirst({
      where: {
        id,
        contentTypeId: contentType.id,
        orgId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!entry) {
      throw new NotFoundException('Content entry not found');
    }

    return {
      id: entry.id,
      contentTypeId: entry.contentTypeId,
      orgId: entry.orgId,
      createdById: entry.createdById,
      createdBy: entry.createdBy,
      status: entry.status as any,
      data: (entry.data as Record<string, any>) || {},
      publishedData: entry.publishedData as Record<string, any> | null,
      publishedAt: entry.publishedAt ? entry.publishedAt.toISOString() : null,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    };
  }

  /**
   * Create a new content entry, dynamically validating against the stored schema.
   */
  async createEntry(
    orgId: string,
    slugOrId: string,
    userId: string,
    input: CreateEntryInput,
  ): Promise<ContentEntryDto> {
    const contentType = await this.resolveContentType(orgId, slugOrId);
    const schemaDef = contentType.schema as unknown as SchemaDefinition;

    // Single-type restriction
    if (contentType.kind === 'SINGLE') {
      const existing = await this.prisma.contentEntry.findFirst({
        where: { contentTypeId: contentType.id, orgId },
      });
      if (existing) {
        throw new BadRequestException(
          'Single-type already contains an entry. Update the existing record instead of creating a new one.',
        );
      }
    }

    // Dynamic Zod validation
    const validation = validateEntryData(schemaDef, input.data || {});
    if (!validation.isValid) {
      throw new BadRequestException({
        message: 'Content validation failed',
        errors: validation.errors,
      });
    }

    if (!userId) {
      throw new BadRequestException('User ID is required to author a content entry');
    }

    const created = await this.prisma.contentEntry.create({
      data: {
        contentType: {
          connect: { id: contentType.id },
        },
        org: {
          connect: { id: orgId },
        },
        createdBy: {
          connect: { id: userId },
        },
        status: 'DRAFT',
        data: validation.data || input.data || {},
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    return {
      id: created.id,
      contentTypeId: created.contentTypeId,
      orgId: created.orgId,
      createdById: created.createdById,
      createdBy: created.createdBy,
      status: created.status as any,
      data: (created.data as Record<string, any>) || {},
      publishedData: created.publishedData as Record<string, any> | null,
      publishedAt: created.publishedAt ? created.publishedAt.toISOString() : null,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }

  /**
   * Update an existing content entry draft, validating against schema.
   */
  async updateEntry(
    orgId: string,
    slugOrId: string,
    id: string,
    input: UpdateEntryInput,
  ): Promise<ContentEntryDto> {
    const contentType = await this.resolveContentType(orgId, slugOrId);
    const schemaDef = contentType.schema as unknown as SchemaDefinition;

    // Verify entry exists
    const existing = await this.prisma.contentEntry.findFirst({
      where: { id, contentTypeId: contentType.id, orgId },
    });
    if (!existing) {
      throw new NotFoundException('Content entry not found');
    }

    // Dynamic Zod validation
    const validation = validateEntryData(schemaDef, input.data || {});
    if (!validation.isValid) {
      throw new BadRequestException({
        message: 'Content validation failed',
        errors: validation.errors,
      });
    }

    const updated = await this.prisma.contentEntry.update({
      where: { id },
      data: {
        data: validation.data || input.data || {},
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    return {
      id: updated.id,
      contentTypeId: updated.contentTypeId,
      orgId: updated.orgId,
      createdById: updated.createdById,
      createdBy: updated.createdBy,
      status: updated.status as any,
      data: (updated.data as Record<string, any>) || {},
      publishedData: updated.publishedData as Record<string, any> | null,
      publishedAt: updated.publishedAt ? updated.publishedAt.toISOString() : null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * Publish a content entry (copies draft data to publishedData, stamps publishedAt).
   */
  async publishEntry(
    orgId: string,
    slugOrId: string,
    id: string,
  ): Promise<ContentEntryDto> {
    const contentType = await this.resolveContentType(orgId, slugOrId);
    const schemaDef = contentType.schema as unknown as SchemaDefinition;

    const existing = await this.prisma.contentEntry.findFirst({
      where: { id, contentTypeId: contentType.id, orgId },
    });
    if (!existing) {
      throw new NotFoundException('Content entry not found');
    }

    // Validate draft before publishing to guarantee clean snapshot
    const validation = validateEntryData(schemaDef, (existing.data as Record<string, any>) || {});
    if (!validation.isValid) {
      throw new BadRequestException({
        message: 'Cannot publish entry with invalid schema data',
        errors: validation.errors,
      });
    }

    const published = await this.prisma.contentEntry.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedData: existing.data || {},
        publishedAt: new Date(),
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    return {
      id: published.id,
      contentTypeId: published.contentTypeId,
      orgId: published.orgId,
      createdById: published.createdById,
      createdBy: published.createdBy,
      status: published.status as any,
      data: (published.data as Record<string, any>) || {},
      publishedData: published.publishedData as Record<string, any> | null,
      publishedAt: published.publishedAt ? published.publishedAt.toISOString() : null,
      createdAt: published.createdAt.toISOString(),
      updatedAt: published.updatedAt.toISOString(),
    };
  }

  /**
   * Unpublish an entry (reverts status to DRAFT and clears publishedData snapshot).
   */
  async unpublishEntry(
    orgId: string,
    slugOrId: string,
    id: string,
  ): Promise<ContentEntryDto> {
    const contentType = await this.resolveContentType(orgId, slugOrId);

    const existing = await this.prisma.contentEntry.findFirst({
      where: { id, contentTypeId: contentType.id, orgId },
    });
    if (!existing) {
      throw new NotFoundException('Content entry not found');
    }

    const unpublished = await this.prisma.contentEntry.update({
      where: { id },
      data: {
        status: 'DRAFT',
        publishedData: null,
        publishedAt: null,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    return {
      id: unpublished.id,
      contentTypeId: unpublished.contentTypeId,
      orgId: unpublished.orgId,
      createdById: unpublished.createdById,
      createdBy: unpublished.createdBy,
      status: unpublished.status as any,
      data: (unpublished.data as Record<string, any>) || {},
      publishedData: null,
      publishedAt: null,
      createdAt: unpublished.createdAt.toISOString(),
      updatedAt: unpublished.updatedAt.toISOString(),
    };
  }

  /**
   * Delete an entry.
   */
  async deleteEntry(
    orgId: string,
    slugOrId: string,
    id: string,
  ): Promise<{ success: boolean }> {
    const contentType = await this.resolveContentType(orgId, slugOrId);

    const existing = await this.prisma.contentEntry.findFirst({
      where: { id, contentTypeId: contentType.id, orgId },
    });
    if (!existing) {
      throw new NotFoundException('Content entry not found');
    }

    await this.prisma.contentEntry.delete({
      where: { id },
    });

    return { success: true };
  }
}
