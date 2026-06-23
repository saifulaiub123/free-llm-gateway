import { describe, expect, it, vi } from 'vitest';
import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { LlmApiTokenGuard } from './llm-api-token.guard.js';
import type { ApiTokenRepository } from '../../modules/tokens/api-token.repository.js';

/** Builds a minimal ExecutionContext exposing a mutable request with the given Authorization header. */
function contextFor(authorization?: string): {
  context: ExecutionContext;
  request: { headers: Record<string, string | undefined>; currentUser?: unknown };
} {
  const request = { headers: authorization ? { authorization } : {} } as {
    headers: Record<string, string | undefined>;
    currentUser?: unknown;
  };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

describe('LlmApiTokenGuard', () => {
  it('rejects a JWT (no sqr-llm- prefix) without touching the database', async () => {
    const findActiveByHash = vi.fn();
    const repository = { findActiveByHash } as unknown as ApiTokenRepository;
    const guard = new LlmApiTokenGuard(repository);

    const { context } = contextFor('Bearer eyJhbGciOiJIUzI1NiJ9.payload.sig');

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(findActiveByHash).not.toHaveBeenCalled();
  });

  it('rejects a missing Authorization header', async () => {
    const guard = new LlmApiTokenGuard({
      findActiveByHash: vi.fn(),
    } as unknown as ApiTokenRepository);

    const { context } = contextFor();

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a revoked or unknown token (hash lookup returns nothing)', async () => {
    const findActiveByHash = vi.fn().mockResolvedValue(undefined);
    const touchLastUsed = vi.fn();
    const repository = { findActiveByHash, touchLastUsed } as unknown as ApiTokenRepository;
    const guard = new LlmApiTokenGuard(repository);

    const { context } = contextFor('Bearer sqr-llm-revoked-secret');

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(touchLastUsed).not.toHaveBeenCalled();
  });

  it('accepts a valid token, stamps last_used_at, and attaches the principal', async () => {
    const findActiveByHash = vi.fn().mockResolvedValue({ id: 5, userId: 9 });
    const touchLastUsed = vi.fn().mockResolvedValue(undefined);
    const repository = { findActiveByHash, touchLastUsed } as unknown as ApiTokenRepository;
    const guard = new LlmApiTokenGuard(repository);

    const token = 'sqr-llm-valid-secret';
    const { context, request } = contextFor(`Bearer ${token}`);

    await expect(guard.canActivate(context)).resolves.toBe(true);

    // Looks the token up by its SHA-256 hash (never the plaintext).
    expect(findActiveByHash).toHaveBeenCalledWith(createHash('sha256').update(token).digest('hex'));
    expect(touchLastUsed).toHaveBeenCalledWith(5);
    expect(request.currentUser).toEqual({ id: 9, role: 'user' });
  });
});
