/**
 * Prisma seed script to initialize default permissions and system roles.
 */

import { PrismaClient } from '@prisma/client';
import {
  Permissions,
  SystemRoles,
  DEFAULT_ROLE_PERMISSIONS,
} from '../libs/shared-types/src/permissions';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding permissions...');

  const permissionList = [
    // Content
    { action: Permissions.CONTENT_CREATE, description: 'Create content entries', group: 'Content' },
    { action: Permissions.CONTENT_READ, description: 'Read content entries', group: 'Content' },
    { action: Permissions.CONTENT_UPDATE, description: 'Update content entries', group: 'Content' },
    { action: Permissions.CONTENT_DELETE, description: 'Delete content entries', group: 'Content' },
    { action: Permissions.CONTENT_PUBLISH, description: 'Publish or unpublish entries', group: 'Content' },

    // Schema
    { action: Permissions.SCHEMA_CREATE, description: 'Create content types and schemas', group: 'Schema' },
    { action: Permissions.SCHEMA_READ, description: 'Read schema definitions', group: 'Schema' },
    { action: Permissions.SCHEMA_UPDATE, description: 'Modify existing schemas', group: 'Schema' },
    { action: Permissions.SCHEMA_DELETE, description: 'Delete schemas', group: 'Schema' },

    // Template
    { action: Permissions.TEMPLATE_CREATE, description: 'Create templates', group: 'Template' },
    { action: Permissions.TEMPLATE_READ, description: 'View templates', group: 'Template' },
    { action: Permissions.TEMPLATE_UPDATE, description: 'Edit templates', group: 'Template' },
    { action: Permissions.TEMPLATE_DELETE, description: 'Delete templates', group: 'Template' },
    { action: Permissions.TEMPLATE_PUBLISH, description: 'Publish templates', group: 'Template' },

    // API Key
    { action: Permissions.APIKEY_CREATE, description: 'Generate API keys', group: 'ApiKey' },
    { action: Permissions.APIKEY_READ, description: 'List API keys', group: 'ApiKey' },
    { action: Permissions.APIKEY_REVOKE, description: 'Revoke API keys', group: 'ApiKey' },

    // Organization
    { action: Permissions.ORG_READ, description: 'View organization details', group: 'Organization' },
    { action: Permissions.ORG_UPDATE, description: 'Update organization settings', group: 'Organization' },
    { action: Permissions.ORG_INVITE, description: 'Invite members to organization', group: 'Organization' },
    { action: Permissions.ORG_REMOVE_MEMBER, description: 'Remove members from organization', group: 'Organization' },

    // Roles
    { action: Permissions.ROLE_CREATE, description: 'Create custom roles', group: 'Role' },
    { action: Permissions.ROLE_READ, description: 'View roles and permissions', group: 'Role' },
    { action: Permissions.ROLE_UPDATE, description: 'Update roles and assign permissions', group: 'Role' },
    { action: Permissions.ROLE_DELETE, description: 'Delete roles', group: 'Role' },
    { action: Permissions.ROLE_MANAGE, description: 'Assign roles to members', group: 'Role' },

    // Audit
    { action: Permissions.AUDIT_READ, description: 'Read audit logs', group: 'Audit' },
  ];

  for (const p of permissionList) {
    await prisma.permission.upsert({
      where: { action: p.action },
      update: { description: p.description, group: p.group },
      create: p,
    });
  }

  console.log('Seeding system roles...');

  for (const roleName of [SystemRoles.SUPER_ADMIN, SystemRoles.EDITOR, SystemRoles.VIEWER]) {
    const role = await prisma.role.upsert({
      where: {
        orgId_name: {
          orgId: null as any,
          name: roleName,
        },
      },
      update: {},
      create: {
        name: roleName,
        isSystem: true,
        orgId: null,
        description: `System defined ${roleName} role`,
      },
    });

    const rolePerms = DEFAULT_ROLE_PERMISSIONS[roleName];
    for (const permAction of rolePerms) {
      const perm = await prisma.permission.findUnique({ where: { action: permAction } });
      if (perm) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: perm.id,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId: perm.id,
          },
        });
      }
    }
  }

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
