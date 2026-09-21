import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../modules/redis/redis.service';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { SystemRoles } from '@cms/shared-types';

/**
 * Guard that enforces RBAC permissions based on active organization and user role,
 * accelerated by sub-millisecond Redis caching.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    @Optional() private readonly redisService?: RedisService,
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

    // Extract and validate organization context
    const headerOrgId = request.headers['x-org-id'] as string | undefined;
    const paramOrgId = request.params?.orgId as string | undefined;

    // Strict validation: if both route parameter and header are provided, they MUST match
    if (headerOrgId && paramOrgId && headerOrgId !== paramOrgId) {
      throw new BadRequestException(
        'Mismatched organization context: X-Org-Id header does not match route :orgId parameter',
      );
    }

    // Route parameter has canonical precedence as it points to the target resource
    const orgId = paramOrgId || headerOrgId;

    if (!orgId) {
      throw new BadRequestException(
        'Organization context (X-Org-Id header or :orgId parameter) is required',
      );
    }

    request.orgId = orgId;

    // 1. Check Redis cache first (TTL 5m)
    let userPermissionsArray: string[] | null = null;
    if (this.redisService?.isReady()) {
      userPermissionsArray = await this.redisService.getUserPermissions(user.sub, orgId);
    }

    // 2. Cache miss: Lookup user's membership and granted permissions from DB
    if (!userPermissionsArray) {
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

      // Super Admin has unrestricted wildcard access
      if (role.isSystem && role.name === SystemRoles.SUPER_ADMIN) {
        userPermissionsArray = ['*'];
      } else {
        userPermissionsArray = role.rolePermissions.map((rp) => rp.permission.action);
      }

      // Store in Redis with TTL 300s (5m)
      if (this.redisService?.isReady()) {
        await this.redisService.setUserPermissions(user.sub, orgId, userPermissionsArray);
      }
    }

    if (userPermissionsArray.includes('*')) {
      return true;
    }

    const userPermissions = new Set(userPermissionsArray);

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
