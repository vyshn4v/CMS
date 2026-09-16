import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TemplateService } from './template.service';
import { JwtAuthGuard } from '../auth/guards/auth.guards';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import {
  Permissions,
  CreateTemplateInput,
  UpdateTemplateInput,
  PreviewTemplateInput,
  TemplateType,
} from '@cms/shared-types';

/**
 * Controller exposing organization-scoped endpoints for template management, publishing, and previewing.
 */
@Controller('orgs/:orgId/templates')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  /**
   * List templates with optional pagination and filters.
   */
  @Get()
  @RequirePermissions(Permissions.TEMPLATE_READ)
  async findAll(
    @Param('orgId') orgId: string,
    @Query('type') type?: TemplateType,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.templateService.findAll(orgId, {
      type,
      status,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  /**
   * Create a new template.
   */
  @Post()
  @RequirePermissions(Permissions.TEMPLATE_CREATE)
  async create(
    @Param('orgId') orgId: string,
    @Body() body: CreateTemplateInput,
  ) {
    return this.templateService.create(orgId, body);
  }

  /**
   * Preview a raw unsaved template draft with sample variables or an entry.
   */
  @Post('preview-raw')
  @RequirePermissions(Permissions.TEMPLATE_READ)
  @HttpCode(HttpStatus.OK)
  async previewRaw(
    @Param('orgId') orgId: string,
    @Body() body: PreviewTemplateInput & { type?: TemplateType },
  ) {
    return this.templateService.preview(orgId, null, body, body.type || 'EMAIL');
  }

  /**
   * Get template by ID.
   */
  @Get(':id')
  @RequirePermissions(Permissions.TEMPLATE_READ)
  async findOne(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.templateService.findOne(orgId, id);
  }

  /**
   * Update template draft.
   */
  @Patch(':id')
  @RequirePermissions(Permissions.TEMPLATE_UPDATE)
  async update(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Body() body: UpdateTemplateInput,
  ) {
    return this.templateService.update(orgId, id, body);
  }

  /**
   * Publish template.
   */
  @Post(':id/publish')
  @RequirePermissions(Permissions.TEMPLATE_PUBLISH)
  @HttpCode(HttpStatus.OK)
  async publish(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Body() body?: { bodyDraft?: string; subjectDraft?: string; name?: string; fieldsDraft?: Record<string, string> },
  ) {
    return this.templateService.publish(orgId, id, body);
  }

  /**
   * Unpublish template.
   */
  @Post(':id/unpublish')
  @RequirePermissions(Permissions.TEMPLATE_UPDATE)
  @HttpCode(HttpStatus.OK)
  async unpublish(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.templateService.unpublish(orgId, id);
  }

  /**
   * Delete template.
   */
  @Delete(':id')
  @RequirePermissions(Permissions.TEMPLATE_DELETE)
  async remove(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.templateService.remove(orgId, id);
  }

  /**
   * Preview an existing template with sample variables or entry.
   */
  @Post(':id/preview')
  @RequirePermissions(Permissions.TEMPLATE_READ)
  @HttpCode(HttpStatus.OK)
  async preview(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Body() body: PreviewTemplateInput,
  ) {
    return this.templateService.preview(orgId, id, body);
  }
}
