import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ContentService } from './content.service';
import { JwtAuthGuard } from '../auth/guards/auth.guards';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  Permissions,
  CreateEntryInput,
  UpdateEntryInput,
  ContentQueryOptions,
} from '@cms/shared-types';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';

/**
 * Controller handling Content Entry CRUD and Draft/Publish operations.
 * Accepts either content type slug (e.g. 'articles') or schemaId (UUID).
 */
@ApiTags('Content')
@ApiBearerAuth('bearer')
@Controller('orgs/:orgId/content/:slug')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get()
  @RequirePermissions(Permissions.CONTENT_READ)
  @ApiOperation({ summary: 'List entries', description: 'Returns all entries for a content type' })
  @ApiParam({ name: 'orgId', type: 'string', description: 'Organization ID' })
  @ApiParam({ name: 'slug', type: 'string', description: 'Content type slug or schema ID' })
  @ApiQuery({ name: 'page', required: false, type: 'number' })
  @ApiQuery({ name: 'limit', required: false, type: 'number' })
  @ApiQuery({ name: 'status', required: false, type: 'string' })
  @ApiResponse({ status: 200, description: 'List of entries' })
  async listEntries(
    @Param('orgId') orgId: string,
    @Param('slug') slug: string,
    @Query() query: ContentQueryOptions,
  ) {
    return this.contentService.listEntries(orgId, slug, query);
  }

  @Post()
  @RequirePermissions(Permissions.CONTENT_CREATE)
  @ApiOperation({ summary: 'Create entry', description: 'Creates a new entry' })
  @ApiParam({ name: 'orgId', type: 'string', description: 'Organization ID' })
  @ApiParam({ name: 'slug', type: 'string', description: 'Content type slug or schema ID' })
  @ApiBody({ type: Object })
  @ApiResponse({ status: 201, description: 'Entry created successfully' })
  async createEntry(
    @Param('orgId') orgId: string,
    @Param('slug') slug: string,
    @CurrentUser('sub') userId: string,
    @Req() req: any,
    @Body() body: CreateEntryInput,
  ) {
    const finalUserId = userId || req.user?.id || req.user?.sub;
    return this.contentService.createEntry(orgId, slug, finalUserId, body);
  }

  @Get(':id')
  @RequirePermissions(Permissions.CONTENT_READ)
  @ApiOperation({ summary: 'Get entry', description: 'Get entry details by ID' })
  @ApiParam({ name: 'orgId', type: 'string', description: 'Organization ID' })
  @ApiParam({ name: 'slug', type: 'string', description: 'Content type slug or schema ID' })
  @ApiParam({ name: 'id', type: 'string', description: 'Entry ID' })
  @ApiResponse({ status: 200, description: 'Entry details' })
  async getEntryById(
    @Param('orgId') orgId: string,
    @Param('slug') slug: string,
    @Param('id') id: string,
  ) {
    return this.contentService.getEntryById(orgId, slug, id);
  }

  @Patch(':id')
  @RequirePermissions(Permissions.CONTENT_UPDATE)
  @ApiOperation({ summary: 'Update entry', description: 'Updates entry details' })
  @ApiParam({ name: 'orgId', type: 'string', description: 'Organization ID' })
  @ApiParam({ name: 'slug', type: 'string', description: 'Content type slug or schema ID' })
  @ApiParam({ name: 'id', type: 'string', description: 'Entry ID' })
  @ApiBody({ type: Object })
  @ApiResponse({ status: 200, description: 'Entry updated successfully' })
  async updateEntry(
    @Param('orgId') orgId: string,
    @Param('slug') slug: string,
    @Param('id') id: string,
    @Body() body: UpdateEntryInput,
  ) {
    return this.contentService.updateEntry(orgId, slug, id, body);
  }

  @Delete(':id')
  @RequirePermissions(Permissions.CONTENT_DELETE)
  @ApiOperation({ summary: 'Delete entry', description: 'Deletes an entry' })
  @ApiParam({ name: 'orgId', type: 'string', description: 'Organization ID' })
  @ApiParam({ name: 'slug', type: 'string', description: 'Content type slug or schema ID' })
  @ApiParam({ name: 'id', type: 'string', description: 'Entry ID' })
  @ApiResponse({ status: 200, description: 'Entry deleted successfully' })
  async deleteEntry(
    @Param('orgId') orgId: string,
    @Param('slug') slug: string,
    @Param('id') id: string,
  ) {
    return this.contentService.deleteEntry(orgId, slug, id);
  }

  @Post(':id/publish')
  @RequirePermissions(Permissions.CONTENT_PUBLISH)
  @ApiOperation({ summary: 'Publish entry', description: 'Publishes an entry' })
  @ApiParam({ name: 'orgId', type: 'string', description: 'Organization ID' })
  @ApiParam({ name: 'slug', type: 'string', description: 'Content type slug or schema ID' })
  @ApiParam({ name: 'id', type: 'string', description: 'Entry ID' })
  @ApiBody({ type: Object, required: false })
  @ApiResponse({ status: 200, description: 'Entry published successfully' })
  async publishEntry(
    @Param('orgId') orgId: string,
    @Param('slug') slug: string,
    @Param('id') id: string,
    @Body() body?: { data?: Record<string, any> },
  ) {
    return this.contentService.publishEntry(orgId, slug, id, body);
  }

  @Post(':id/unpublish')
  @RequirePermissions(Permissions.CONTENT_PUBLISH)
  @ApiOperation({ summary: 'Unpublish entry', description: 'Unpublishes an entry' })
  @ApiParam({ name: 'orgId', type: 'string', description: 'Organization ID' })
  @ApiParam({ name: 'slug', type: 'string', description: 'Content type slug or schema ID' })
  @ApiParam({ name: 'id', type: 'string', description: 'Entry ID' })
  @ApiResponse({ status: 200, description: 'Entry unpublished successfully' })
  async unpublishEntry(
    @Param('orgId') orgId: string,
    @Param('slug') slug: string,
    @Param('id') id: string,
  ) {
    return this.contentService.unpublishEntry(orgId, slug, id);
  }
}
