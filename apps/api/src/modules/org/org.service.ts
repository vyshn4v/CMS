import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import {
  CreateOrganizationInput,
  UpdateOrganizationInput,
  InviteMemberInput,
  UpdateMemberRoleInput,
  OrganizationDto,
  OrgMemberDto,
  SystemRoles,
} from '@cms/shared-types';

/**
 * Service managing organizations, member invitations, and organization roles.
 */
@Injectable()
export class OrgService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly redisService?: RedisService,
  ) {}

  /**
   * List all organizations where the user is a member.
   */
  async listUserOrgs(userId: string): Promise<Array<OrganizationDto & { role: string }>> {
    const memberships = await this.prisma.orgMember.findMany({
      where: { userId },
      include: {
        org: true,
        role: true,
      },
      orderBy: { joinedAt: 'asc' },
    });

    return memberships.map((m) => ({
      id: m.org.id,
      name: m.org.name,
      slug: m.org.slug,
      logoUrl: m.org.logoUrl,
      role: m.role.name,
      createdAt: m.org.createdAt.toISOString(),
      updatedAt: m.org.updatedAt.toISOString(),
    }));
  }

  /**
   * Retrieve single organization details.
   */
  async getOrg(orgId: string): Promise<OrganizationDto> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      logoUrl: org.logoUrl,
      createdAt: org.createdAt.toISOString(),
      updatedAt: org.updatedAt.toISOString(),
    };
  }

  /**
   * Create a new organization and assign creator as Super Admin.
   */
  async createOrg(userId: string, input: CreateOrganizationInput): Promise<OrganizationDto> {
    if (!input.name || input.name.trim().length === 0) {
      throw new BadRequestException('Organization name is required');
    }

    const baseSlug = input.slug
      ? input.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')
      : input.name.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');

    let slug = baseSlug;
    let counter = 1;
    while (await this.prisma.organization.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Find Super Admin role
    let superAdminRole = await this.prisma.role.findFirst({
      where: { name: SystemRoles.SUPER_ADMIN, orgId: null },
    });

    if (!superAdminRole) {
      superAdminRole = await this.prisma.role.create({
        data: {
          name: SystemRoles.SUPER_ADMIN,
          isSystem: true,
          description: 'Full system administrator',
        },
      });
    }

    const org = await this.prisma.organization.create({
      data: {
        name: input.name.trim(),
        slug,
        logoUrl: input.logoUrl,
        members: {
          create: {
            userId,
            roleId: superAdminRole.id,
          },
        },
      },
    });

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      logoUrl: org.logoUrl,
      createdAt: org.createdAt.toISOString(),
      updatedAt: org.updatedAt.toISOString(),
    };
  }

  /**
   * Update organization properties.
   */
  async updateOrg(orgId: string, input: UpdateOrganizationInput): Promise<OrganizationDto> {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    let newSlug = org.slug;
    if (input.slug !== undefined && input.slug.trim().length > 0) {
      const sanitizedSlug = input.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
      if (sanitizedSlug !== org.slug) {
        const existing = await this.prisma.organization.findUnique({ where: { slug: sanitizedSlug } });
        if (existing && existing.id !== orgId) {
          throw new BadRequestException('Workspace slug is already in use by another workspace');
        }
        newSlug = sanitizedSlug;
      }
    }

    const updated = await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        name: input.name !== undefined && input.name.trim().length > 0 ? input.name.trim() : org.name,
        slug: newSlug,
        logoUrl: input.logoUrl !== undefined ? input.logoUrl : org.logoUrl,
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      logoUrl: updated.logoUrl,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * List all members and assigned roles within an organization.
   */
  async listMembers(orgId: string): Promise<OrgMemberDto[]> {
    const members = await this.prisma.orgMember.findMany({
      where: { orgId },
      include: {
        user: true,
        role: true,
      },
      orderBy: { joinedAt: 'asc' },
    });

    return members.map((m) => ({
      id: m.id,
      userId: m.userId,
      orgId: m.orgId,
      roleId: m.roleId,
      roleName: m.role.name,
      user: {
        id: m.user.id,
        email: m.user.email,
        name: m.user.name,
        avatarUrl: m.user.avatarUrl,
      },
      joinedAt: m.joinedAt.toISOString(),
    }));
  }

  /**
   * Invite or add a member to the organization by email.
   */
  async inviteMember(orgId: string, input: InviteMemberInput): Promise<OrgMemberDto> {
    const email = input.email.trim().toLowerCase();

    // Verify target role exists
    const role = await this.prisma.role.findFirst({
      where: {
        id: input.roleId,
        OR: [{ orgId: null }, { orgId }],
      },
    });

    if (!role) {
      throw new BadRequestException('Specified role not found for this organization');
    }

    // Find or create pending user
    let user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          googleId: `pending_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          name: email.split('@')[0],
        },
      });
    }

    // Check if already a member
    const existing = await this.prisma.orgMember.findUnique({
      where: {
        userId_orgId: {
          userId: user.id,
          orgId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('User is already a member of this organization');
    }

    const member = await this.prisma.orgMember.create({
      data: {
        userId: user.id,
        orgId,
        roleId: role.id,
      },
      include: {
        user: true,
        role: true,
      },
    });

    return {
      id: member.id,
      userId: member.userId,
      orgId: member.orgId,
      roleId: member.roleId,
      roleName: member.role.name,
      user: {
        id: member.user.id,
        email: member.user.email,
        name: member.user.name,
        avatarUrl: member.user.avatarUrl,
      },
      joinedAt: member.joinedAt.toISOString(),
    };
  }

  /**
   * Update the role of a member.
   */
  async updateMemberRole(
    orgId: string,
    memberId: string,
    input: UpdateMemberRoleInput,
    currentUserId?: string,
  ): Promise<OrgMemberDto> {
    const member = await this.prisma.orgMember.findUnique({
      where: { id: memberId },
      include: { role: true },
    });

    if (!member || member.orgId !== orgId) {
      throw new NotFoundException('Member not found');
    }

    // SEC-07: Prevent self-modification of roles
    if (currentUserId && member.userId === currentUserId) {
      throw new ForbiddenException('You cannot modify your own role in the organization');
    }

    const role = await this.prisma.role.findFirst({
      where: {
        id: input.roleId,
        OR: [{ orgId: null }, { orgId }],
      },
    });

    if (!role) {
      throw new BadRequestException('Target role not found');
    }

    // SEC-07: Only existing Super Admins can grant or revoke the Super Admin role
    if (currentUserId) {
      const callerMembership = await this.prisma.orgMember.findUnique({
        where: {
          userId_orgId: {
            userId: currentUserId,
            orgId,
          },
        },
        include: { role: true },
      });

      const isCallerSuperAdmin = callerMembership?.role?.name === SystemRoles.SUPER_ADMIN;

      if (
        (role.name === SystemRoles.SUPER_ADMIN || member.role.name === SystemRoles.SUPER_ADMIN) &&
        !isCallerSuperAdmin
      ) {
        throw new ForbiddenException(
          'Only existing Super Admins can grant or revoke the Super Admin role',
        );
      }
    }

    const updated = await this.prisma.orgMember.update({
      where: { id: memberId },
      data: { roleId: role.id },
      include: { user: true, role: true },
    });

    // SEC-08: Invalidate Redis permissions cache on role change
    if (this.redisService?.isReady()) {
      await this.redisService.invalidateUserPermissions(member.userId, orgId);
    }

    return {
      id: updated.id,
      userId: updated.userId,
      orgId: updated.orgId,
      roleId: updated.roleId,
      roleName: updated.role.name,
      user: {
        id: updated.user.id,
        email: updated.user.email,
        name: updated.user.name,
        avatarUrl: updated.user.avatarUrl,
      },
      joinedAt: updated.joinedAt.toISOString(),
    };
  }

  /**
   * Remove a member from the organization.
   */
  async removeMember(
    orgId: string,
    memberId: string,
    currentUserId: string,
  ): Promise<{ success: boolean }> {
    const member = await this.prisma.orgMember.findUnique({
      where: { id: memberId },
      include: { role: true },
    });

    if (!member || member.orgId !== orgId) {
      throw new NotFoundException('Member not found');
    }

    // Protect last Super Admin
    if (member.role.name === SystemRoles.SUPER_ADMIN) {
      const superAdminCount = await this.prisma.orgMember.count({
        where: {
          orgId,
          role: { name: SystemRoles.SUPER_ADMIN },
        },
      });

      if (superAdminCount <= 1) {
        throw new ForbiddenException(
          'Cannot remove the only Super Admin from the organization',
        );
      }
    }

    await this.prisma.orgMember.delete({
      where: { id: memberId },
    });

    // SEC-08: Invalidate Redis permissions cache immediately upon removal
    if (this.redisService?.isReady()) {
      await this.redisService.invalidateUserPermissions(member.userId, orgId);
    }

    return { success: true };
  }
}
