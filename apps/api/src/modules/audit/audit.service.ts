import { Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AuditLogDto, AuditLogQueryDto, AuditLogListResponse } from '@cms/shared-types';

export interface CreateAuditLogInput {
  orgId: string;
  userId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  details?: Record<string, any> | null;
  ipAddress?: string | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly redisService?: RedisService,
  ) {}

  /**
   * Asynchronously records an audit log entry.
   * Wrapped in try/catch to ensure audit logging never disrupts primary user requests.
   */
  async createLog(input: CreateAuditLogInput): Promise<void> {
    try {
      if (!input.orgId) return;

      await this.prisma.auditLog.create({
        data: {
          orgId: input.orgId,
          userId: input.userId || null,
          action: input.action.toUpperCase(),
          resourceType: input.resourceType.toLowerCase(),
          resourceId: input.resourceId || null,
          details: input.details ? (input.details as any) : undefined,
          ipAddress: input.ipAddress || null,
        },
      });
    } catch (err: any) {
      this.logger.warn(`Failed to persist audit log: ${err.message}`);
    }
  }

  /**
   * Retrieves paginated audit logs for an organization with optional filters.
   */
  async findAll(orgId: string, query: AuditLogQueryDto): Promise<AuditLogListResponse> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const cacheKey = `audit:logs:${orgId}:p${page}:l${limit}:a${query.action || 'ALL'}:r${query.resourceType || 'ALL'}:u${query.userId || 'ALL'}:s${query.startDate || ''}:e${query.endDate || ''}:q${query.search || ''}`;

    if (this.redisService?.isReady()) {
      const cached = await this.redisService.getAuditLogs<AuditLogListResponse>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const where: any = { orgId };

    if (query.action && query.action !== 'ALL') {
      where.action = query.action.toUpperCase();
    }

    if (query.resourceType && query.resourceType !== 'ALL') {
      where.resourceType = query.resourceType.toLowerCase();
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate);
      }
    }

    if (query.search) {
      where.OR = [
        { action: { contains: query.search, mode: 'insensitive' } },
        { resourceType: { contains: query.search, mode: 'insensitive' } },
        { resourceId: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      }),
    ]);

    const formattedItems: AuditLogDto[] = items.map((log) => ({
      id: log.id,
      orgId: log.orgId,
      userId: log.userId,
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      details: log.details as Record<string, any> | null,
      ipAddress: log.ipAddress,
      createdAt: log.createdAt.toISOString(),
      user: log.user
        ? {
            id: log.user.id,
            name: log.user.name,
            email: log.user.email,
            avatarUrl: log.user.avatarUrl,
          }
        : null,
    }));

    const response: AuditLogListResponse = {
      items: formattedItems,
      total,
      page,
      limit,
    };

    if (this.redisService?.isReady()) {
      // Cache audit logs query for 30 seconds (low-priority read shielding PostgreSQL)
      await this.redisService.setAuditLogs(cacheKey, response, 30);
    }

    return response;
  }
}
