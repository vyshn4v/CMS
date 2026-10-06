import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateRoleInput,
  UpdateRoleInput,
  RoleDto,
  PermissionGroupDto,
} from '@cms/shared-types';

import { RedisService } from '../redis/redis.service';

/**
 * Service managing RBAC permissions and organization-scoped custom roles.
 */
@Injectable()
export class RoleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Retrieve all system permissions grouped by domain.
   */
  async listAllPermissions(): Promise<PermissionGroupDto[]> {
    if (this.redisService?.isReady()) {
      const cached = await this.redisService.getAllPermissions<PermissionGroupDto[]>();
      if (cached) return cached;
    }

    const permissions = await this.prisma.permission.findMany({
      orderBy: [{ group: 'asc' }, { action: 'asc' }],
    });

    const groupsMap = new Map<string, Array<{ id: string; action: string; description: string }>>();

    for (const p of permissions) {
      if (!groupsMap.has(p.group)) {
        groupsMap.set(p.group, []);
      }
      groupsMap.get(p.group)!.push({
        id: p.id,
        action: p.action,
        description: p.description,
      });
    }

    const result = Array.from(groupsMap.entries()).map(([group, perms]) => ({
      group,
      permissions: perms,
    }));

    if (this.redisService?.isReady()) {
      await this.redisService.setAllPermissions(result, 3600);
    }

    return result;
  }

  /**
   * List both system roles and custom roles created within an organization.
   */
  async listRoles(orgId: string): Promise<RoleDto[]> {
    if (this.redisService?.isReady()) {
      const cached = await this.redisService.getOrgRoles<RoleDto[]>(orgId);
      if (cached) return cached;
    }

    const roles = await this.prisma.role.findMany({
      where: {
        OR: [{ orgId: null }, { orgId }],
      },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });

    const result = roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      isSystem: r.isSystem,
      orgId: r.orgId,
      permissions: r.rolePermissions.map((rp) => rp.permission.action),
      createdAt: r.createdAt.toISOString(),
    }));

    if (this.redisService?.isReady()) {
      await this.redisService.setOrgRoles(orgId, result, 60);
    }

    return result;
  }

  /**
   * Create a new custom role scoped to an organization.
   */
  async createRole(orgId: string, input: CreateRoleInput): Promise<RoleDto> {
    if (!input.name || input.name.trim().length === 0) {
      throw new BadRequestException('Role name is required');
    }

    const existing = await this.prisma.role.findFirst({
      where: { orgId, name: input.name.trim() },
    });

    if (existing) {
      throw new BadRequestException(`A role named "${input.name}" already exists in this organization`);
    }

    // Resolve permission IDs from actions
    const validPerms = await this.prisma.permission.findMany({
      where: { action: { in: input.permissions } },
    });

    const role = await this.prisma.role.create({
      data: {
        name: input.name.trim(),
        description: input.description,
        isSystem: false,
        orgId,
        rolePermissions: {
          create: validPerms.map((p) => ({
            permissionId: p.id,
          })),
        },
      },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
      },
    });

    if (this.redisService?.isReady()) {
      await this.redisService.invalidateOrgRoles(orgId);
    }

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      orgId: role.orgId,
      permissions: role.rolePermissions.map((rp) => rp.permission.action),
      createdAt: role.createdAt.toISOString(),
    };
  }

  /**
   * Update an existing custom role's details and permissions.
   */
  async updateRole(orgId: string, roleId: string, input: UpdateRoleInput): Promise<RoleDto> {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role || (role.orgId !== orgId && !role.isSystem)) {
      throw new NotFoundException('Role not found');
    }

    if (role.isSystem) {
      throw new ForbiddenException('System roles (Super Admin, Editor, Viewer) cannot be modified');
    }

    // Update permissions transactionally if provided
    if (input.permissions) {
      const validPerms = await this.prisma.permission.findMany({
        where: { action: { in: input.permissions } },
      });

      await this.prisma.rolePermission.deleteMany({
        where: { roleId },
      });

      await this.prisma.rolePermission.createMany({
        data: validPerms.map((p) => ({
          roleId,
          permissionId: p.id,
        })),
      });
    }

    const updated = await this.prisma.role.update({
      where: { id: roleId },
      data: {
        name: input.name?.trim() || role.name,
        description: input.description !== undefined ? input.description : role.description,
      },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
      },
    });

    if (this.redisService?.isReady()) {
      await this.redisService.invalidateAllOrgPermissions(orgId);
      await this.redisService.invalidateOrgRoles(orgId);
    }

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      isSystem: updated.isSystem,
      orgId: updated.orgId,
      permissions: updated.rolePermissions.map((rp) => rp.permission.action),
      createdAt: updated.createdAt.toISOString(),
    };
  }

  /**
   * Delete a custom role if it is not currently assigned to any member.
   */
  async deleteRole(orgId: string, roleId: string): Promise<{ success: boolean }> {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role || role.orgId !== orgId) {
      throw new NotFoundException('Role not found');
    }

    if (role.isSystem) {
      throw new ForbiddenException('System roles cannot be deleted');
    }

    const assignedMembers = await this.prisma.orgMember.count({
      where: { roleId },
    });

    if (assignedMembers > 0) {
      throw new BadRequestException(
        `Cannot delete role because it is currently assigned to ${assignedMembers} member(s)`,
      );
    }

    await this.prisma.role.delete({
      where: { id: roleId },
    });

    if (this.redisService?.isReady()) {
      await this.redisService.invalidateOrgRoles(orgId);
    }

    return { success: true };
  }
}
