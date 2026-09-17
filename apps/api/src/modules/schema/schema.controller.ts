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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';

/**
 * Controller handling Content Type schema definition endpoints.
 */
@ApiTags('Schemas')
@ApiBearerAuth('bearer')
@Controller('orgs/:orgId/schemas')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class SchemaController {
  constructor(private readonly schemaService: SchemaService) {}

  @Get()
  @RequirePermissions(Permissions.SCHEMA_READ)
  @ApiOperation({ summary: 'List schemas', description: 'Returns all schemas for an organization' })
  @ApiParam({ name: 'orgId', type: 'string', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'List of schemas' })
  async listSchemas(@Param('orgId') orgId: string) {
    return this.schemaService.listSchemas(orgId);
  }

  @Post()
  @RequirePermissions(Permissions.SCHEMA_CREATE)
  @ApiOperation({ summary: 'Create schema', description: 'Creates a new schema' })
  @ApiParam({ name: 'orgId', type: 'string', description: 'Organization ID' })
  @ApiBody({ type: Object })
  @ApiResponse({ status: 201, description: 'Schema created successfully' })
  async createSchema(
    @Param('orgId') orgId: string,
    @Body() body: CreateContentTypeInput,
  ) {
    return this.schemaService.createSchema(orgId, body);
  }

  @Get(':id')
  @RequirePermissions(Permissions.SCHEMA_READ)
  @ApiOperation({ summary: 'Get schema', description: 'Get schema details by ID' })
  @ApiParam({ name: 'orgId', type: 'string', description: 'Organization ID' })
  @ApiParam({ name: 'id', type: 'string', description: 'Schema ID' })
  @ApiResponse({ status: 200, description: 'Schema details' })
  async getSchemaById(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.schemaService.getSchemaById(orgId, id);
  }

  @Get('slug/:slug')
  @RequirePermissions(Permissions.SCHEMA_READ)
  @ApiOperation({ summary: 'Get schema by slug', description: 'Get schema details by slug' })
  @ApiParam({ name: 'orgId', type: 'string', description: 'Organization ID' })
  @ApiParam({ name: 'slug', type: 'string', description: 'Schema slug' })
  @ApiResponse({ status: 200, description: 'Schema details' })
  async getSchemaBySlug(
    @Param('orgId') orgId: string,
    @Param('slug') slug: string,
  ) {
    return this.schemaService.getSchemaBySlug(orgId, slug);
  }

  @Patch(':id')
  @RequirePermissions(Permissions.SCHEMA_UPDATE)
  @ApiOperation({ summary: 'Update schema', description: 'Updates schema details' })
  @ApiParam({ name: 'orgId', type: 'string', description: 'Organization ID' })
  @ApiParam({ name: 'id', type: 'string', description: 'Schema ID' })
  @ApiBody({ type: Object })
  @ApiResponse({ status: 200, description: 'Schema updated successfully' })
  async updateSchema(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Body() body: UpdateContentTypeInput,
  ) {
    return this.schemaService.updateSchema(orgId, id, body);
  }

  @Delete(':id')
  @RequirePermissions(Permissions.SCHEMA_DELETE)
  @ApiOperation({ summary: 'Delete schema', description: 'Deletes a schema' })
  @ApiParam({ name: 'orgId', type: 'string', description: 'Organization ID' })
  @ApiParam({ name: 'id', type: 'string', description: 'Schema ID' })
  @ApiResponse({ status: 200, description: 'Schema deleted successfully' })
  async deleteSchema(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.schemaService.deleteSchema(orgId, id);
  }
}
