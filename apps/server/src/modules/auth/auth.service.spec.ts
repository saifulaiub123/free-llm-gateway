import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service.js';
import type { UsersRepository } from './users.repository.js';
import type { RefreshTokenService } from './refresh-token.service.js';

/**
 * Unit tests for the auth orchestration with mocked persistence: password hashing, credential
 * verification, and refresh rotation (TASK-012). Uses real Argon2 to prove hashes are not plaintext.
 */
describe('AuthService', () => {
  const users = { findByEmail: vi.fn(), create: vi.fn(), findById: vi.fn() };
  const jwt = { signAsync: vi.fn() };
  const refreshTokens = { issue: vi.fn(), rotate: vi.fn(), revoke: vi.fn() };
  const config = { getOrThrow: vi.fn(), get: vi.fn() };

  let service: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    jwt.signAsync.mockResolvedValue('access-jwt');
    refreshTokens.issue.mockResolvedValue('refresh-tok');
    config.getOrThrow.mockReturnValue('access-secret');
    config.get.mockReturnValue('15m');
    service = new AuthService(
      users as unknown as UsersRepository,
      jwt as unknown as JwtService,
      refreshTokens as unknown as RefreshTokenService,
      config as unknown as ConfigService,
    );
  });

  it('registers a user with a hashed password and returns a token pair', async () => {
    users.findByEmail.mockResolvedValue(undefined);
    users.create.mockImplementation((values: { email: string; passwordHash: string }) =>
      Promise.resolve({ id: 1, role: 'user', ...values }),
    );

    const result = await service.register('a@b.com', 'password123');

    expect(result).toEqual({ accessToken: 'access-jwt', refreshToken: 'refresh-tok' });
    const stored = users.create.mock.calls[0]?.[0] as { passwordHash: string };
    expect(stored.passwordHash).not.toBe('password123');
    expect(await argon2.verify(stored.passwordHash, 'password123')).toBe(true);
  });

  it('rejects registration when the email already exists', async () => {
    users.findByEmail.mockResolvedValue({ id: 1 });
    await expect(service.register('a@b.com', 'password123')).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects login with a wrong password', async () => {
    const passwordHash = await argon2.hash('correct-pass', { type: argon2.argon2id });
    users.findByEmail.mockResolvedValue({ id: 1, role: 'user', passwordHash });
    await expect(service.login('a@b.com', 'wrong-pass')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('logs in with the correct password and returns a token pair', async () => {
    const passwordHash = await argon2.hash('correct-pass', { type: argon2.argon2id });
    users.findByEmail.mockResolvedValue({ id: 1, role: 'user', passwordHash });

    const result = await service.login('a@b.com', 'correct-pass');

    expect(result.accessToken).toBe('access-jwt');
  });

  it('refreshes by rotating the token and issuing a new pair in the same family', async () => {
    refreshTokens.rotate.mockResolvedValue({ userId: 1, familyId: 'fam-1' });
    users.findById.mockResolvedValue({ id: 1, role: 'user' });

    const result = await service.refresh('old-refresh');

    expect(refreshTokens.rotate).toHaveBeenCalledWith('old-refresh');
    expect(refreshTokens.issue).toHaveBeenCalledWith(1, undefined, 'fam-1');
    expect(result.refreshToken).toBe('refresh-tok');
  });
});
