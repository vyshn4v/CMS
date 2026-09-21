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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';
import { CreateTemplateDto, UpdateTemplateDto, PreviewTemplateDto, PublishTemplateDto } from './dto/template.dto';

/**
 * Controller exposing organization-scoped endpoints for template management, publishing, and previewing.
 */
@ApiTags('Templates')
@ApiBearerAuth('bearer')
@Controller('orgs/:orgId/templates')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  /**
   * List templates with optional pagination and filters.
   */
  @Get()
  @RequirePermissions(Permissions.TEMPLATE_READ)
  @ApiOperation({ summary: 'List templates', description: 'Returns all templates for an organization' })
  @ApiParam({ name: 'orgId', type: 'string', description: 'Organization ID' })
  @ApiQuery({ name: 'type', required: false, enum: ['EMAIL', 'WEB'] })
  @ApiQuery({ name: 'contentTypeId', required: false, type: 'string' })
  @ApiQuery({ name: 'status', required: false, type: 'string' })
  @ApiQuery({ name: 'search', required: false, type: 'string' })
  @ApiQuery({ name: 'page', required: false, type: 'string' })
  @ApiQuery({ name: 'limit', required: false, type: 'string' })
  @ApiResponse({ status: 200, description: 'List of templates' })
  async findAll(
    @Param('orgId') orgId: string,
    @Query('type') type?: TemplateType,
    @Query('contentTypeId') contentTypeId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.templateService.findAll(orgId, {
      type,
      contentTypeId,
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
  @ApiOperation({ summary: 'Create template', description: 'Creates a new template' })
  @ApiParam({ name: 'orgId', type: 'string', description: 'Organization ID' })
  @ApiBody({ type: CreateTemplateDto })
  @ApiResponse({ status: 201, description: 'Template created successfully' })
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
  @ApiOperation({ summary: 'Preview raw template', description: 'Previews an unsaved template draft' })
  @ApiParam({ name: 'orgId', type: 'string', description: 'Organization ID' })
  @ApiBody({ type: PreviewTemplateDto })
  @ApiResponse({ status: 200, description: 'Template preview' })
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
  @ApiOperation({ summary: 'Get template', description: 'Get a template by ID' })
  @ApiParam({ name: 'orgId', type: 'string', description: 'Organization ID' })
  @ApiParam({ name: 'id', type: 'string', description: 'Template ID' })
  @ApiResponse({ status: 200, description: 'Template details' })
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
  @ApiOperation({ summary: 'Update template', description: 'Updates a template draft' })
  @ApiParam({ name: 'orgId', type: 'string', description: 'Organization ID' })
  @ApiParam({ name: 'id', type: 'string', description: 'Template ID' })
  @ApiBody({ type: UpdateTemplateDto })
  @ApiResponse({ status: 200, description: 'Template updated successfully' })
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
  @ApiOperation({ summary: 'Publish template', description: 'Publishes a template draft' })
  @ApiParam({ name: 'orgId', type: 'string', description: 'Organization ID' })
  @ApiParam({ name: 'id', type: 'string', description: 'Template ID' })
  @ApiBody({ type: PublishTemplateDto, required: false })
  @ApiResponse({ status: 200, description: 'Template published successfully' })
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
  @ApiOperation({ summary: 'Unpublish template', description: 'Unpublishes a template' })
  @ApiParam({ name: 'orgId', type: 'string', description: 'Organization ID' })
  @ApiParam({ name: 'id', type: 'string', description: 'Template ID' })
  @ApiResponse({ status: 200, description: 'Template unpublished successfully' })
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
  @ApiOperation({ summary: 'Delete template', description: 'Deletes a template' })
  @ApiParam({ name: 'orgId', type: 'string', description: 'Organization ID' })
  @ApiParam({ name: 'id', type: 'string', description: 'Template ID' })
  @ApiResponse({ status: 200, description: 'Template deleted successfully' })
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
  @ApiOperation({ summary: 'Preview template', description: 'Previews an existing template' })
  @ApiParam({ name: 'orgId', type: 'string', description: 'Organization ID' })
  @ApiParam({ name: 'id', type: 'string', description: 'Template ID' })
  @ApiBody({ type: PreviewTemplateDto })
  @ApiResponse({ status: 200, description: 'Template preview' })
  async preview(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Body() body: PreviewTemplateInput,
  ) {
    return this.templateService.preview(orgId, id, body);
  }
}
