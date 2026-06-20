import { describe, expect, it, vi } from 'vitest';
import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard.js';
import type { CurrentUser } from '../../modules/auth/auth.types.js';

/** Builds a guard wired to a Reflector that returns the given required roles. */
function guardRequiring(required: string[] | undefined): RolesGuard {
  const reflector = { getAllAndOverride: vi.fn().mockReturnValue(required) } as unknown as Reflector;
  return new RolesGuard(reflector);
}

/** Minimal ExecutionContext exposing a request with the given principal. */
function contextFor(user?: CurrentUser): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('allows any authenticated principal when no roles are required', () => {
    const guard = guardRequiring(undefined);
    expect(guard.canActivate(contextFor({ id: 1, role: 'user' }))).toBe(true);
  });

  it('denies a user on an admin-only route (403)', () => {
    const guard = guardRequiring(['admin']);
    expect(() => guard.canActivate(contextFor({ id: 1, role: 'user' }))).toThrow(ForbiddenException);
  });

  it('allows an admin on an admin-only route', () => {
    const guard = guardRequiring(['admin']);
    expect(guard.canActivate(contextFor({ id: 1, role: 'admin' }))).toBe(true);
  });

  it('denies when no principal is present', () => {
    const guard = guardRequiring(['admin']);
    expect(() => guard.canActivate(contextFor(undefined))).toThrow(ForbiddenException);
  });
});
