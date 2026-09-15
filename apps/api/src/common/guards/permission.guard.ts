import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { SystemRoles } from '@cms/shared-types';

/**
 * Guard that enforces RBAC permissions based on active organization and user role.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If route does not declare @RequirePermissions(), allow passage
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.sub) {
      throw new ForbiddenException('User authentication required for permission check');
    }

    // Extract orgId from header or route parameter
    const orgId = (request.headers['x-org-id'] as string) || request.params.orgId;

    if (!orgId) {
      throw new BadRequestException(
        'Organization context (X-Org-Id header or :orgId parameter) is required',
      );
    }

    // Lookup user's membership and granted permissions for this organization
    const member = await this.prisma.orgMember.findUnique({
      where: {
        userId_orgId: {
          userId: user.sub,
          orgId,
        },
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('You do not belong to the requested organization');
    }

    const role = member.role;

    // Super Admin has unrestricted access to all endpoints
    if (role.isSystem && role.name === SystemRoles.SUPER_ADMIN) {
      return true;
    }

    const userPermissions = new Set(
      role.rolePermissions.map((rp) => rp.permission.action),
    );

    for (const perm of requiredPermissions) {
      if (!userPermissions.has(perm)) {
        throw new ForbiddenException(
          `Access denied: Missing required permission [${perm}]`,
        );
      }
    }

    return true;
  }
}
