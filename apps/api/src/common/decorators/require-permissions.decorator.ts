import { SetMetadata } from '@nestjs/common';
import { Permission } from '@cms/shared-types';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to require specific RBAC permissions for a controller or route handler.
 */
export const RequirePermissions = (...permissions: Permission[] | string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
