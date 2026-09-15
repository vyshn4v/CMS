import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '@cms/shared-types';

/**
 * Parameter decorator to extract authenticated user payload from request.
 */
export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data && user ? user[data] : user;
  },
);
