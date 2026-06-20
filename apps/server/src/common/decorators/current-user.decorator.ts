import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { CurrentUser as Principal } from '../../modules/auth/auth.types.js';

/**
 * Injects the authenticated principal attached to the request by an auth guard.
 *
 * WHY it reads both fields: `JwtAuthGuard` (Passport) attaches the principal as `request.user`,
 * while `LlmApiTokenGuard` attaches it as `request.currentUser`; reading either lets one decorator
 * serve both the management (`/api/v1`) and gateway (`/v1`) auth surfaces.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Principal => {
    const request = ctx.switchToHttp().getRequest<{ user?: Principal; currentUser?: Principal }>();
    return (request.user ?? request.currentUser) as Principal;
  },
);
