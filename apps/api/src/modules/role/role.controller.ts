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
import { RoleService } from './role.service';
import { JwtAuthGuard } from '../auth/guards/auth.guards';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { Permissions, CreateRoleInput, UpdateRoleInput } from '@cms/shared-types';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';

/**
 * Controller handling permission listings and organization-scoped roles.
 */
@ApiTags('Roles')
@ApiBearerAuth('bearer')
@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get('permissions')
  @ApiOperation({ summary: 'List permissions', description: 'Returns all available permissions' })
  @ApiResponse({ status: 200, description: 'List of permissions' })
  async listPermissions() {
    return this.roleService.listAllPermissions();
  }

  @Get('orgs/:orgId/roles')
  @RequirePermissions(Permissions.ROLE_READ)
  @ApiOperation({ summary: 'List roles', description: 'Returns all roles for an organization' })
  @ApiParam({ name: 'orgId', type: 'string', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'List of roles' })
  async listRoles(@Param('orgId') orgId: string) {
    return this.roleService.listRoles(orgId);
  }

  @Post('orgs/:orgId/roles')
  @RequirePermissions(Permissions.ROLE_CREATE)
  @ApiOperation({ summary: 'Create role', description: 'Creates a new role' })
  @ApiParam({ name: 'orgId', type: 'string', description: 'Organization ID' })
  @ApiBody({ type: Object })
  @ApiResponse({ status: 201, description: 'Role created successfully' })
  async createRole(@Param('orgId') orgId: string, @Body() body: CreateRoleInput) {
    return this.roleService.createRole(orgId, body);
  }

  @Patch('orgs/:orgId/roles/:id')
  @RequirePermissions(Permissions.ROLE_UPDATE)
  @ApiOperation({ summary: 'Update role', description: 'Updates a role' })
  @ApiParam({ name: 'orgId', type: 'string', description: 'Organization ID' })
  @ApiParam({ name: 'id', type: 'string', description: 'Role ID' })
  @ApiBody({ type: Object })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  async updateRole(
    @Param('orgId') orgId: string,
    @Param('id') roleId: string,
    @Body() body: UpdateRoleInput,
  ) {
    return this.roleService.updateRole(orgId, roleId, body);
  }

  @Delete('orgs/:orgId/roles/:id')
  @RequirePermissions(Permissions.ROLE_DELETE)
  @ApiOperation({ summary: 'Delete role', description: 'Deletes a role' })
  @ApiParam({ name: 'orgId', type: 'string', description: 'Organization ID' })
  @ApiParam({ name: 'id', type: 'string', description: 'Role ID' })
  @ApiResponse({ status: 200, description: 'Role deleted successfully' })
  async deleteRole(@Param('orgId') orgId: string, @Param('id') roleId: string) {
    return this.roleService.deleteRole(orgId, roleId);
  }
}
