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
import {
  Permissions,
  CreateEntryInput,
  UpdateEntryInput,
  ContentQueryOptions,
} from '@cms/shared-types';

/**
 * Controller handling Content Entry CRUD and Draft/Publish operations.
 * Accepts either content type slug (e.g. 'articles') or schemaId (UUID).
 */
@Controller('orgs/:orgId/content/:slug')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get()
  @RequirePermissions(Permissions.CONTENT_READ)
  async listEntries(
    @Param('orgId') orgId: string,
    @Param('slug') slug: string,
    @Query() query: ContentQueryOptions,
  ) {
    return this.contentService.listEntries(orgId, slug, query);
  }

  @Post()
  @RequirePermissions(Permissions.CONTENT_CREATE)
  async createEntry(
    @Param('orgId') orgId: string,
    @Param('slug') slug: string,
    @Req() req: any,
    @Body() body: CreateEntryInput,
  ) {
    const userId = req.user?.id;
    return this.contentService.createEntry(orgId, slug, userId, body);
  }

  @Get(':id')
  @RequirePermissions(Permissions.CONTENT_READ)
  async getEntryById(
    @Param('orgId') orgId: string,
    @Param('slug') slug: string,
    @Param('id') id: string,
  ) {
    return this.contentService.getEntryById(orgId, slug, id);
  }

  @Patch(':id')
  @RequirePermissions(Permissions.CONTENT_UPDATE)
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
  async deleteEntry(
    @Param('orgId') orgId: string,
    @Param('slug') slug: string,
    @Param('id') id: string,
  ) {
    return this.contentService.deleteEntry(orgId, slug, id);
  }

  @Post(':id/publish')
  @RequirePermissions(Permissions.CONTENT_PUBLISH)
  async publishEntry(
    @Param('orgId') orgId: string,
    @Param('slug') slug: string,
    @Param('id') id: string,
  ) {
    return this.contentService.publishEntry(orgId, slug, id);
  }

  @Post(':id/unpublish')
  @RequirePermissions(Permissions.CONTENT_PUBLISH)
  async unpublishEntry(
    @Param('orgId') orgId: string,
    @Param('slug') slug: string,
    @Param('id') id: string,
  ) {
    return this.contentService.unpublishEntry(orgId, slug, id);
  }
}
