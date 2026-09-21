/**
 * Granular RBAC Permissions & System Roles.
 */

export const Permissions = {
  // Content permissions
  CONTENT_CREATE: 'content.create',
  CONTENT_READ: 'content.read',
  CONTENT_UPDATE: 'content.update',
  CONTENT_DELETE: 'content.delete',
  CONTENT_PUBLISH: 'content.publish',

  // Schema permissions
  SCHEMA_CREATE: 'schema.create',
  SCHEMA_READ: 'schema.read',
  SCHEMA_UPDATE: 'schema.update',
  SCHEMA_DELETE: 'schema.delete',

  // Template permissions
  TEMPLATE_CREATE: 'template.create',
  TEMPLATE_READ: 'template.read',
  TEMPLATE_UPDATE: 'template.update',
  TEMPLATE_DELETE: 'template.delete',
  TEMPLATE_PUBLISH: 'template.publish',

  // API Key permissions
  APIKEY_CREATE: 'apikey.create',
  APIKEY_READ: 'apikey.read',
  APIKEY_REVOKE: 'apikey.revoke',

  // Organization permissions
  ORG_READ: 'org.read',
  ORG_UPDATE: 'org.update',
  ORG_INVITE: 'org.invite',
  ORG_REMOVE_MEMBER: 'org.remove_member',

  // Role permissions
  ROLE_CREATE: 'role.create',
  ROLE_READ: 'role.read',
  ROLE_UPDATE: 'role.update',
  ROLE_DELETE: 'role.delete',
  ROLE_MANAGE: 'role.manage',

  // Audit permissions
  AUDIT_READ: 'audit.read',
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];

export const SystemRoles = {
  SUPER_ADMIN: 'Super Admin',
  EDITOR: 'Editor',
  VIEWER: 'Viewer',
} as const;

export type SystemRole = (typeof SystemRoles)[keyof typeof SystemRoles];

/**
 * Default permission mappings for seeded system roles.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<SystemRole, Permission[]> = {
  [SystemRoles.SUPER_ADMIN]: Object.values(Permissions),
  [SystemRoles.EDITOR]: [
    Permissions.CONTENT_CREATE,
    Permissions.CONTENT_READ,
    Permissions.CONTENT_UPDATE,
    Permissions.CONTENT_DELETE,
    Permissions.CONTENT_PUBLISH,
    Permissions.TEMPLATE_CREATE,
    Permissions.TEMPLATE_READ,
    Permissions.TEMPLATE_UPDATE,
    Permissions.TEMPLATE_DELETE,
    Permissions.TEMPLATE_PUBLISH,
    Permissions.SCHEMA_READ,
    Permissions.ORG_READ,
  ],
  [SystemRoles.VIEWER]: [
    Permissions.CONTENT_READ,
    Permissions.TEMPLATE_READ,
    Permissions.SCHEMA_READ,
    Permissions.ORG_READ,
    Permissions.AUDIT_READ,
  ],
};
