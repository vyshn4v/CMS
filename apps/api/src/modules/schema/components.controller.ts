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

/**
 * Controller managing reusable components library for organizations.
 */
@Controller('orgs/:orgId/components')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ComponentsController {
  constructor(private readonly schemaService: SchemaService) {}

  /**
   * List all components in the organization.
   */
  @Get()
  @RequirePermissions(Permissions.SCHEMA_READ)
  async listComponents(@Param('orgId') orgId: string) {
    return this.schemaService.listComponents(orgId);
  }

  /**
   * Get single component by ID.
   */
  @Get(':id')
  @RequirePermissions(Permissions.SCHEMA_READ)
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
  async deleteComponent(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.schemaService.deleteComponent(orgId, id);
  }
}
