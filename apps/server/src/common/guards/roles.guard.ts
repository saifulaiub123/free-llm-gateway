import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { CurrentUser } from '../../modules/auth/auth.types.js';

/** Metadata key under which {@link Roles} stores the required roles for a route. */
export const ROLES_KEY = 'roles';

/** Marks a controller or handler as requiring one of the given roles (read by {@link RolesGuard}). */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Authorizes a route only when the authenticated principal holds one of the required roles.
 *
 * WHY it composes with the auth guards: `JwtAuthGuard`/`LlmApiTokenGuard` authenticate (attach the
 * principal); this guard authorizes (checks `role`) AFTER them. Routes without `@Roles()` stay open
 * to any authenticated principal, so authorization is opt-in per route. Handler metadata overrides
 * controller metadata so a class-level `@Roles('admin')` can be relaxed on a specific method.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  /**
   * @param context The request context; its handler/class `@Roles()` metadata defines the requirement.
   * @returns true when no roles are required or the principal satisfies one; throws otherwise.
   */
  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) {
      return true;
    }
    const request = context
      .switchToHttp()
      .getRequest<{ user?: CurrentUser; currentUser?: CurrentUser }>();
    const principal = request.user ?? request.currentUser;
    if (!principal || !required.includes(principal.role)) {
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }
}
