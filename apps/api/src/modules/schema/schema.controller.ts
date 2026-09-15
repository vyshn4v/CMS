import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { SchemaService } from './schema.service';
import { JwtAuthGuard } from '../auth/guards/auth.guards';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import {
  Permissions,
  CreateContentTypeInput,
  UpdateContentTypeInput,
} from '@cms/shared-types';

/**
 * Controller handling Content Type schema definition endpoints.
 */
@Controller('orgs/:orgId/schemas')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class SchemaController {
  constructor(private readonly schemaService: SchemaService) {}

  @Get()
  @RequirePermissions(Permissions.SCHEMA_READ)
  async listSchemas(@Param('orgId') orgId: string) {
    return this.schemaService.listSchemas(orgId);
  }

  @Post()
  @RequirePermissions(Permissions.SCHEMA_CREATE)
  async createSchema(
    @Param('orgId') orgId: string,
    @Body() body: CreateContentTypeInput,
  ) {
    return this.schemaService.createSchema(orgId, body);
  }

  @Get(':id')
  @RequirePermissions(Permissions.SCHEMA_READ)
  async getSchemaById(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.schemaService.getSchemaById(orgId, id);
  }

  @Get('slug/:slug')
  @RequirePermissions(Permissions.SCHEMA_READ)
  async getSchemaBySlug(
    @Param('orgId') orgId: string,
    @Param('slug') slug: string,
  ) {
    return this.schemaService.getSchemaBySlug(orgId, slug);
  }

  @Patch(':id')
  @RequirePermissions(Permissions.SCHEMA_UPDATE)
  async updateSchema(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Body() body: UpdateContentTypeInput,
  ) {
    return this.schemaService.updateSchema(orgId, id, body);
  }

  @Delete(':id')
  @RequirePermissions(Permissions.SCHEMA_DELETE)
  async deleteSchema(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.schemaService.deleteSchema(orgId, id);
  }
}
