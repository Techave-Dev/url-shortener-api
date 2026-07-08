import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext): unknown => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user;

    if (!data) return user;
    if (user && typeof user === 'object' && data in user) {
      return user[data];
    }
    return undefined;
  },
);
