import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateContentTypeInput,
  UpdateContentTypeInput,
  ContentTypeDto,
  FieldDefinition,
  ComponentDto,
  CreateComponentInput,
  UpdateComponentInput,
} from '@cms/shared-types';

/**
 * Service managing Content Type schema creation, updates, and validations.
 */
@Injectable()
export class SchemaService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all content types defined within an organization.
   */
  async listSchemas(orgId: string): Promise<ContentTypeDto[]> {
    const types = await this.prisma.contentType.findMany({
      where: { orgId },
      orderBy: { name: 'asc' },
    });

    return types.map((t) => ({
      id: t.id,
      orgId: t.orgId,
      name: t.name,
      slug: t.slug,
      description: t.description,
      kind: t.kind as any,
      schema: t.schema as any,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));
  }

  /**
   * Retrieve single content type by ID.
   */
  async getSchemaById(orgId: string, id: string): Promise<ContentTypeDto> {
    const contentType = await this.prisma.contentType.findFirst({
      where: { id, orgId },
    });

    if (!contentType) {
      throw new NotFoundException('Content type not found');
    }

    return {
      id: contentType.id,
      orgId: contentType.orgId,
      name: contentType.name,
      slug: contentType.slug,
      description: contentType.description,
      kind: contentType.kind as any,
      schema: contentType.schema as any,
      createdAt: contentType.createdAt.toISOString(),
      updatedAt: contentType.updatedAt.toISOString(),
    };
  }

  /**
   * Retrieve single content type by slug.
   */
  async getSchemaBySlug(orgId: string, slug: string): Promise<ContentTypeDto> {
    const contentType = await this.prisma.contentType.findFirst({
      where: { slug, orgId },
    });

    if (!contentType) {
      throw new NotFoundException(`Content type with slug "${slug}" not found`);
    }

    return {
      id: contentType.id,
      orgId: contentType.orgId,
      name: contentType.name,
      slug: contentType.slug,
      description: contentType.description,
      kind: contentType.kind as any,
      schema: contentType.schema as any,
      createdAt: contentType.createdAt.toISOString(),
      updatedAt: contentType.updatedAt.toISOString(),
    };
  }

  /**
   * Create a new Content Type schema.
   */
  async createSchema(orgId: string, input: CreateContentTypeInput): Promise<ContentTypeDto> {
    if (!input.name || input.name.trim().length === 0) {
      throw new BadRequestException('Content type name is required');
    }

    const baseSlug = input.slug
      ? input.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')
      : input.name.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');

    const existing = await this.prisma.contentType.findUnique({
      where: {
        orgId_slug: { orgId, slug: baseSlug },
      },
    });

    if (existing) {
      throw new BadRequestException(`A content type with slug "${baseSlug}" already exists in this workspace`);
    }

    this.validateFields(input.schema?.fields || []);

    const created = await this.prisma.contentType.create({
      data: {
        orgId,
        name: input.name.trim(),
        slug: baseSlug,
        description: input.description,
        kind: (input.kind as any) || 'COLLECTION',
        schema: (input.schema || { fields: [] }) as any,
      },
    });

    return {
      id: created.id,
      orgId: created.orgId,
      name: created.name,
      slug: created.slug,
      description: created.description,
      kind: created.kind as any,
      schema: created.schema as any,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }

  /**
   * Update schema fields, description, or display name.
   */
  async updateSchema(
    orgId: string,
    id: string,
    input: UpdateContentTypeInput,
  ): Promise<ContentTypeDto> {
    const contentType = await this.prisma.contentType.findFirst({
      where: { id, orgId },
    });

    if (!contentType) {
      throw new NotFoundException('Content type not found');
    }

    if (input.schema?.fields) {
      this.validateFields(input.schema.fields);
    }

    const updated = await this.prisma.contentType.update({
      where: { id },
      data: {
        name: input.name?.trim() || contentType.name,
        description: input.description !== undefined ? input.description : contentType.description,
        kind: (input.kind as any) || contentType.kind,
        schema: input.schema ? (input.schema as any) : contentType.schema,
      },
    });

    return {
      id: updated.id,
      orgId: updated.orgId,
      name: updated.name,
      slug: updated.slug,
      description: updated.description,
      kind: updated.kind as any,
      schema: updated.schema as any,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * Delete a content type and cascade its entries.
   */
  async deleteSchema(orgId: string, id: string): Promise<{ success: boolean }> {
    const contentType = await this.prisma.contentType.findFirst({
      where: { id, orgId },
    });

    if (!contentType) {
      throw new NotFoundException('Content type not found');
    }

    await this.prisma.contentType.delete({
      where: { id },
    });

    return { success: true };
  }

  /**
   * Validate field definition names, uniqueness, and types.
   */
  private validateFields(fields: FieldDefinition[]) {
    const names = new Set<string>();
    const reserved = new Set(['id', '_id', 'created_at', 'updated_at', 'status']);

    for (const field of fields) {
      if (!field.name || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field.name)) {
        throw new BadRequestException(
          `Invalid field name "${field.name}". Must be alphanumeric or underscore (e.g. blog_title)`,
        );
      }

      if (names.has(field.name.toLowerCase())) {
        throw new BadRequestException(`Duplicate field name "${field.name}" detected in schema`);
      }

      if (reserved.has(field.name.toLowerCase())) {
        throw new BadRequestException(`"${field.name}" is a reserved system field name`);
      }

      names.add(field.name.toLowerCase());
    }
  }

  // =========================================================================
  // REUSABLE COMPONENTS
  // =========================================================================

  /**
   * List all reusable components for an organization.
   */
  async listComponents(orgId: string): Promise<ComponentDto[]> {
    const components = await this.prisma.component.findMany({
      where: { orgId },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    return components.map((c) => ({
      id: c.id,
      orgId: c.orgId,
      name: c.name,
      slug: c.slug,
      category: c.category,
      schema: c.schema as any,
      createdAt: c.createdAt.toISOString(),
    }));
  }

  /**
   * Retrieve a single component by ID.
   */
  async getComponentById(orgId: string, id: string): Promise<ComponentDto> {
    const component = await this.prisma.component.findFirst({
      where: {
        orgId,
        OR: [{ id }, { slug: id }],
      },
    });

    if (!component) {
      throw new NotFoundException(`Component ${id} not found`);
    }

    return {
      id: component.id,
      orgId: component.orgId,
      name: component.name,
      slug: component.slug,
      category: component.category,
      schema: component.schema as any,
      createdAt: component.createdAt.toISOString(),
    };
  }

  /**
   * Create a new reusable component.
   */
  async createComponent(orgId: string, input: CreateComponentInput): Promise<ComponentDto> {
    if (!input.name || input.name.trim().length < 2) {
      throw new BadRequestException('Component name must be at least 2 characters');
    }

    const slug =
      input.slug?.trim() ||
      input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    const existing = await this.prisma.component.findUnique({
      where: { orgId_slug: { orgId, slug } },
    });

    if (existing) {
      throw new BadRequestException(`Component with slug "${slug}" already exists`);
    }

    if (input.schema?.fields) {
      this.validateFields(input.schema.fields);
    }

    const record = await this.prisma.component.create({
      data: {
        orgId,
        name: input.name.trim(),
        slug,
        category: input.category?.trim() || 'default',
        schema: (input.schema || { fields: [] }) as any,
      },
    });

    return {
      id: record.id,
      orgId: record.orgId,
      name: record.name,
      slug: record.slug,
      category: record.category,
      schema: record.schema as any,
      createdAt: record.createdAt.toISOString(),
    };
  }

  /**
   * Update an existing component.
   */
  async updateComponent(
    orgId: string,
    id: string,
    input: UpdateComponentInput,
  ): Promise<ComponentDto> {
    const component = await this.prisma.component.findFirst({
      where: { id, orgId },
    });

    if (!component) {
      throw new NotFoundException(`Component ${id} not found`);
    }

    if (input.schema?.fields) {
      this.validateFields(input.schema.fields);
    }

    const updated = await this.prisma.component.update({
      where: { id },
      data: {
        ...(input.name ? { name: input.name.trim() } : {}),
        ...(input.category ? { category: input.category.trim() } : {}),
        ...(input.schema ? { schema: input.schema as any } : {}),
      },
    });

    return {
      id: updated.id,
      orgId: updated.orgId,
      name: updated.name,
      slug: updated.slug,
      category: updated.category,
      schema: updated.schema as any,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  /**
   * Delete a component.
   */
  async deleteComponent(orgId: string, id: string): Promise<{ success: boolean }> {
    const component = await this.prisma.component.findFirst({
      where: { id, orgId },
    });

    if (!component) {
      throw new NotFoundException(`Component ${id} not found`);
    }

    await this.prisma.component.delete({
      where: { id },
    });

    return { success: true };
  }
}

