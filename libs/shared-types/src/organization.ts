/**
 * Organization & Membership contracts.
 */

export interface OrganizationDto {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrgMemberDto {
  id: string;
  userId: string;
  orgId: string;
  roleId: string;
  roleName: string;
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl?: string | null;
  };
  joinedAt: string;
}

export interface RoleDto {
  id: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  orgId?: string | null;
  permissions: string[];
  createdAt: string;
}

export interface CreateOrganizationInput {
  name: string;
  slug?: string;
  logoUrl?: string;
}

export interface UpdateOrganizationInput {
  name?: string;
  logoUrl?: string;
}

export interface InviteMemberInput {
  email: string;
  roleId: string;
}

export interface UpdateMemberRoleInput {
  roleId: string;
}

export interface CreateRoleInput {
  name: string;
  description?: string;
  permissions: string[];
}

export interface UpdateRoleInput {
  name?: string;
  description?: string;
  permissions?: string[];
}

export interface PermissionGroupDto {
  group: string;
  permissions: Array<{
    id: string;
    action: string;
    description: string;
  }>;
}

