import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ApiErrorResponse } from '@cms/shared-types';

/**
 * Global HTTP exception filter to ensure consistent error response envelopes.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected internal error occurred';
    let code = 'INTERNAL_SERVER_ERROR';
    let details: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const obj = res as any;
        message = obj.message || obj.error || message;
        code = obj.error || HttpStatus[status] || code;
        details = Array.isArray(obj.message) ? obj.message : obj.details;
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled exception at ${request.method} ${request.url}: ${exception.message}`, exception.stack);
    }

    const payload: ApiErrorResponse = {
      status,
      error: {
        code,
        message: Array.isArray(message) ? message[0] : message,
        details: Array.isArray(details)
          ? details.map((d) => (typeof d === 'string' ? { message: d } : d))
          : undefined,
      },
    };

    response.status(status).json(payload);
  }
}
