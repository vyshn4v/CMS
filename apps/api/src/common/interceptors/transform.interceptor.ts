import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '@cms/shared-types';

/**
 * Interceptor that standardizes all successful controller responses into ApiResponse<T>.
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const statusCode = response.statusCode || 200;

    return next.handle().pipe(
      map((res) => {
        // If the handler already returned an ApiResponse envelope (numeric HTTP status or explicit meta)
        if (
          res &&
          typeof res === 'object' &&
          'data' in res &&
          (typeof (res as any).status === 'number' || 'meta' in res)
        ) {
          return {
            status: typeof (res as any).status === 'number' ? (res as any).status : statusCode,
            data: (res as any).data,
            meta: (res as any).meta,
          };
        }

        return {
          status: statusCode,
          data: res,
        };
      }),
    );
  }
}
