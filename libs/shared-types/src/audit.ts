/**
 * Audit Log contracts and query parameters.
 */

export interface AuditLogDto {
  id: string;
  orgId: string;
  userId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  details?: Record<string, any> | null;
  ipAddress?: string | null;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  } | null;
}

export interface AuditLogQueryDto {
  page?: number;
  limit?: number;
  action?: string;
  resourceType?: string;
  userId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface AuditLogListResponse {
  items: AuditLogDto[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}
