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
