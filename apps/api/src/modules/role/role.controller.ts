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

/**
 * Controller handling permission listings and organization-scoped roles.
 */
@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get('permissions')
  async listPermissions() {
    return this.roleService.listAllPermissions();
  }

  @Get('orgs/:orgId/roles')
  @RequirePermissions(Permissions.ROLE_READ)
  async listRoles(@Param('orgId') orgId: string) {
    return this.roleService.listRoles(orgId);
  }

  @Post('orgs/:orgId/roles')
  @RequirePermissions(Permissions.ROLE_CREATE)
  async createRole(@Param('orgId') orgId: string, @Body() body: CreateRoleInput) {
    return this.roleService.createRole(orgId, body);
  }

  @Patch('orgs/:orgId/roles/:id')
  @RequirePermissions(Permissions.ROLE_UPDATE)
  async updateRole(
    @Param('orgId') orgId: string,
    @Param('id') roleId: string,
    @Body() body: UpdateRoleInput,
  ) {
    return this.roleService.updateRole(orgId, roleId, body);
  }

  @Delete('orgs/:orgId/roles/:id')
  @RequirePermissions(Permissions.ROLE_DELETE)
  async deleteRole(@Param('orgId') orgId: string, @Param('id') roleId: string) {
    return this.roleService.deleteRole(orgId, roleId);
  }
}
