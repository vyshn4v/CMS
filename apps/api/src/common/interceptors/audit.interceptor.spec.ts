import { of, throwError } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';
import { AuditService } from '../../modules/audit/audit.service';
import { ExecutionContext, CallHandler, HttpException, HttpStatus } from '@nestjs/common';

describe('AuditInterceptor', () => {
  let interceptor: AuditInterceptor;
  let auditService: jest.Mocked<AuditService>;

  beforeEach(() => {
    auditService = {
      createLog: jest.fn().mockResolvedValue(undefined),
    } as any;
    interceptor = new AuditInterceptor(auditService);
  });

  const createMockContext = (method: string, url: string, body: any = {}, headers: any = {}, params: any = {}) => {
    const req = {
      method,
      originalUrl: url,
      url,
      body,
      headers: { 'x-org-id': 'org-123', ...headers },
      params,
      user: { sub: 'user-456' },
      ip: '127.0.0.1',
    };
    return {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as unknown as ExecutionContext;
  };

  it('should ignore non-mutating GET requests', (done) => {
    const context = createMockContext('GET', '/api/v1/schemas');
    const next: CallHandler = {
      handle: () => of({ success: true }),
    };

    interceptor.intercept(context, next).subscribe({
      next: (val) => {
        expect(val).toEqual({ success: true });
        expect(auditService.createLog).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('should record audit log on successful mutation and deeply mask secrets', (done) => {
    const payload = {
      name: 'Test',
      credentials: {
        apiKey: 'secret_key_value',
        token: 'jwt.token.val',
      },
      plain: 'visible',
    };
    const context = createMockContext('POST', '/api/v1/schemas', payload);
    const next: CallHandler = {
      handle: () => of({ id: 'schema-999', name: 'Test' }),
    };

    interceptor.intercept(context, next).subscribe({
      next: () => {
        expect(auditService.createLog).toHaveBeenCalledTimes(1);
        const logged = (auditService.createLog as jest.Mock).mock.calls[0][0];
        expect(logged.action).toBe('CREATE');
        expect(logged.resourceType).toBe('schema');
        expect(logged.details.credentials.apiKey).toBe('***REDACTED***');
        expect(logged.details.credentials.token).toBe('***REDACTED***');
        expect(logged.details.plain).toBe('visible');
        done();
      },
    });
  });

  it('should record SECURITY_REJECTION on 401 or 403 failure', (done) => {
    const context = createMockContext('DELETE', '/api/v1/schemas/sch-1');
    const next: CallHandler = {
      handle: () => throwError(() => new HttpException('Forbidden', HttpStatus.FORBIDDEN)),
    };

    interceptor.intercept(context, next).subscribe({
      error: (err) => {
        expect(err.getStatus()).toBe(HttpStatus.FORBIDDEN);
        expect(auditService.createLog).toHaveBeenCalledTimes(1);
        const logged = (auditService.createLog as jest.Mock).mock.calls[0][0];
        expect(logged.action).toBe('SECURITY_REJECTION');
        expect(logged.details.statusCode).toBe(403);
        done();
      },
    });
  });

  it('should record FAILED_MUTATION on 400 bad request', (done) => {
    const context = createMockContext('PATCH', '/api/v1/schemas/sch-1', { malformed: true });
    const next: CallHandler = {
      handle: () => throwError(() => new HttpException('Bad Request', HttpStatus.BAD_REQUEST)),
    };

    interceptor.intercept(context, next).subscribe({
      error: (err) => {
        expect(err.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        expect(auditService.createLog).toHaveBeenCalledTimes(1);
        const logged = (auditService.createLog as jest.Mock).mock.calls[0][0];
        expect(logged.action).toBe('FAILED_MUTATION');
        expect(logged.details.statusCode).toBe(400);
        done();
      },
    });
  });
});
