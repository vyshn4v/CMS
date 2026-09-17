import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SchemaService } from './schema.service';
import { JwtAuthGuard } from '../auth/guards/auth.guards';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { Permissions, CreateComponentInput, UpdateComponentInput } from '@cms/shared-types';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';

/**
 * Controller managing reusable components library for organizations.
 */
@ApiTags('Components')
@ApiBearerAuth('bearer')
@Controller('orgs/:orgId/components')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ComponentsController {
  constructor(private readonly schemaService: SchemaService) {}

  /**
   * List all components in the organization.
   */
  @Get()
  @RequirePermissions(Permissions.SCHEMA_READ)
  @ApiOperation({ summary: 'List components', description: 'Returns all components in the organization' })
  @ApiParam({ name: 'orgId', type: 'string', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'List of components' })
  async listComponents(@Param('orgId') orgId: string) {
    return this.schemaService.listComponents(orgId);
  }

  /**
   * Get single component by ID.
   */
  @Get(':id')
  @RequirePermissions(Permissions.SCHEMA_READ)
  @ApiOperation({ summary: 'Get component', description: 'Get a single component by ID' })
  @ApiParam({ name: 'orgId', type: 'string', description: 'Organization ID' })
  @ApiParam({ name: 'id', type: 'string', description: 'Component ID' })
  @ApiResponse({ status: 200, description: 'Component details' })
  async getComponent(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.schemaService.getComponentById(orgId, id);
  }

  /**
   * Create a new component.
   */
  @Post()
  @RequirePermissions(Permissions.SCHEMA_CREATE)
  @ApiOperation({ summary: 'Create component', description: 'Creates a new component' })
  @ApiParam({ name: 'orgId', type: 'string', description: 'Organization ID' })
  @ApiBody({ type: Object })
  @ApiResponse({ status: 201, description: 'Component created successfully' })
  async createComponent(
    @Param('orgId') orgId: string,
    @Body() body: CreateComponentInput,
  ) {
    return this.schemaService.createComponent(orgId, body);
  }

  /**
   * Update an existing component.
   */
  @Patch(':id')
  @RequirePermissions(Permissions.SCHEMA_UPDATE)
  @ApiOperation({ summary: 'Update component', description: 'Updates an existing component' })
  @ApiParam({ name: 'orgId', type: 'string', description: 'Organization ID' })
  @ApiParam({ name: 'id', type: 'string', description: 'Component ID' })
  @ApiBody({ type: Object })
  @ApiResponse({ status: 200, description: 'Component updated successfully' })
  async updateComponent(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Body() body: UpdateComponentInput,
  ) {
    return this.schemaService.updateComponent(orgId, id, body);
  }

  /**
   * Delete a component.
   */
  @Delete(':id')
  @RequirePermissions(Permissions.SCHEMA_DELETE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete component', description: 'Deletes a component' })
  @ApiParam({ name: 'orgId', type: 'string', description: 'Organization ID' })
  @ApiParam({ name: 'id', type: 'string', description: 'Component ID' })
  @ApiResponse({ status: 200, description: 'Component deleted successfully' })
  async deleteComponent(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.schemaService.deleteComponent(orgId, id);
  }
}
