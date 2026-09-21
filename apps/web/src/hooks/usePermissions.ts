import { useAuthStore } from '../store/auth.store';
import { Permissions } from '@cms/shared-types';

/**
 * Hook to inspect permissions and RBAC roles for the active organization.
 */
export function usePermissions() {
  const { activeOrg } = useAuthStore();
  const perms = activeOrg?.permissions || [];
  const role = activeOrg?.role || '';
  const isSuperAdmin = role === 'Super Admin' || perms.includes('*');

  const hasPermission = (permission: string): boolean => {
    if (isSuperAdmin) return true;
    return perms.includes(permission);
  };

  const canEditSchema = hasPermission(Permissions.SCHEMA_UPDATE);
  const canCreateSchema = hasPermission(Permissions.SCHEMA_CREATE);
  const canDeleteSchema = hasPermission(Permissions.SCHEMA_DELETE);

  const canEditContent = hasPermission(Permissions.CONTENT_UPDATE);
  const canCreateContent = hasPermission(Permissions.CONTENT_CREATE);
  const canDeleteContent = hasPermission(Permissions.CONTENT_DELETE);
  const canPublishContent = hasPermission(Permissions.CONTENT_PUBLISH);

  const canEditTemplate = hasPermission(Permissions.TEMPLATE_UPDATE);
  const canCreateTemplate = hasPermission(Permissions.TEMPLATE_CREATE);
  const canDeleteTemplate = hasPermission(Permissions.TEMPLATE_DELETE);
  const canPublishTemplate = hasPermission(Permissions.TEMPLATE_PUBLISH);

  const isReadOnly = !canEditSchema;

  return {
    role,
    permissions: perms,
    isSuperAdmin,
    isReadOnly,
    hasPermission,
    canEditSchema,
    canCreateSchema,
    canDeleteSchema,
    canEditContent,
    canCreateContent,
    canDeleteContent,
    canPublishContent,
    canEditTemplate,
    canCreateTemplate,
    canDeleteTemplate,
    canPublishTemplate,
  };
}
