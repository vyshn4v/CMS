import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AuditService } from '../../modules/audit/audit.service';

const SENSITIVE_PATTERN = /password|secret|token|key|authorization|bearer/i;

/**
 * Interceptor that automatically records audit logs for mutating API requests
 * (POST, PATCH, PUT, DELETE) across organizations, including failure and security rejection events.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const req = http.getRequest();
    const method = req.method?.toUpperCase();

    // Only audit mutating operations
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const path = req.originalUrl || req.url || '';

    // Ignore public render, preview, and authentication endpoints
    if (
      path.includes('/render') ||
      path.includes('/preview') ||
      path.includes('/auth/') ||
      path.includes('/health')
    ) {
      return next.handle();
    }

    const orgId =
      req.params?.orgId ||
      req.headers?.['x-org-id'] ||
      req.body?.orgId;

    const userId = req.user?.sub || req.user?.id || null;
    const ipAddress =
      (req.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket?.remoteAddress ||
      null;

    return next.handle().pipe(
      tap((responseBody) => {
        if (!orgId) return;

        const resourceType = this.resolveResourceType(path);
        const action = this.resolveAction(method, path);
        const resourceId =
          req.params?.id ||
          responseBody?.data?.id ||
          responseBody?.id ||
          null;

        const details = this.sanitizeDetails(req.body);

        this.auditService.createLog({
          orgId,
          userId,
          action,
          resourceType,
          resourceId,
          details,
          ipAddress,
        });
      }),
      catchError((err) => {
        if (orgId) {
          const resourceType = this.resolveResourceType(path);
          const statusCode = err?.status || err?.statusCode || 500;
          const action =
            statusCode === 401 || statusCode === 403
              ? 'SECURITY_REJECTION'
              : 'FAILED_MUTATION';
          const resourceId = req.params?.id || null;
          const details = {
            statusCode,
            error: err?.name || 'Error',
            message: err?.message || 'Request failed',
            payload: this.sanitizeDetails(req.body),
          };

          this.auditService.createLog({
            orgId,
            userId,
            action,
            resourceType,
            resourceId,
            details,
            ipAddress,
          });
        }
        return throwError(() => err);
      }),
    );
  }

  private resolveResourceType(path: string): string {
    if (path.includes('/schemas')) return 'schema';
    if (path.includes('/components')) return 'component';
    if (path.includes('/content/')) return 'content_entry';
    if (path.includes('/templates')) return 'template';
    if (path.includes('/api-keys')) return 'api_key';
    if (path.includes('/roles')) return 'role';
    if (path.includes('/members')) return 'member';
    if (path.includes('/orgs')) return 'organization';
    return 'resource';
  }

  private resolveAction(method: string, path: string): string {
    if (path.includes('/publish')) return 'PUBLISH';
    if (path.includes('/unpublish')) return 'UNPUBLISH';
    if (path.includes('/invite')) return 'INVITE_MEMBER';
    if (method === 'POST') return 'CREATE';
    if (method === 'PATCH' || method === 'PUT') return 'UPDATE';
    if (method === 'DELETE') return 'DELETE';
    return method;
  }

  private sanitizeDetails(body: any): Record<string, any> | null {
    if (!body || typeof body !== 'object') return null;
    return this.deepMask(body);
  }

  private deepMask(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
      return obj.map((item) => this.deepMask(item));
    }

    const sanitized: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (SENSITIVE_PATTERN.test(k)) {
        sanitized[k] = '***REDACTED***';
      } else if (typeof v === 'object' && v !== null) {
        sanitized[k] = this.deepMask(v);
      } else {
        sanitized[k] = v;
      }
    }
    return sanitized;
  }
}
