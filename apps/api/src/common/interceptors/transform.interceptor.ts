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
        // If the handler already returned an object with data and meta, pass through cleanly
        if (res && typeof res === 'object' && 'data' in res && ('meta' in res || 'status' in res)) {
          return {
            status: res.status || statusCode,
            data: res.data,
            meta: res.meta,
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
