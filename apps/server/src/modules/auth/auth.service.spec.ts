import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service.js';
import type { UsersRepository } from './users.repository.js';
import type { RefreshTokenService } from './refresh-token.service.js';
import type { SettingsService } from '../settings/settings.service.js';

/** Builds an {@link AuthService} over fresh mocked collaborators with sensible defaults. */
function setup() {
  const users = { findByEmail: vi.fn(), create: vi.fn(), findById: vi.fn(), count: vi.fn() };
  const jwt = { signAsync: vi.fn().mockResolvedValue('access-jwt') };
  const refreshTokens = {
    issue: vi.fn().mockResolvedValue('refresh-tok'),
    rotate: vi.fn(),
    revoke: vi.fn(),
  };
  const config = {
    getOrThrow: vi.fn().mockReturnValue('access-secret'),
    get: vi.fn().mockReturnValue('15m'),
  };
  const settings = { get: vi.fn().mockResolvedValue(true) };
  users.count.mockResolvedValue(1); // not the first user unless a test overrides
  users.create.mockImplementation((values: Record<string, unknown>) =>
    Promise.resolve({ id: 1, role: 'user', ...values }),
  );
  const service = new AuthService(
    users as unknown as UsersRepository,
    jwt as unknown as JwtService,
    refreshTokens as unknown as RefreshTokenService,
    config as unknown as ConfigService,
    settings as unknown as SettingsService,
  );
  return { service, users, jwt, refreshTokens, settings };
}

/**
 * Registration: hashing, duplicate rejection, and the Phase 10 first-user-admin bootstrap +
 * registration gating (TASK-012/073, TEST-016/017). Uses real Argon2 to prove hashes aren't plaintext.
 */
describe('AuthService.register', () => {
  let h: ReturnType<typeof setup>;
  beforeEach(() => {
    h = setup();
    h.users.findByEmail.mockResolvedValue(undefined);
  });

  it('registers a user with a hashed password and returns a token pair', async () => {
    const result = await h.service.register('a@b.com', 'password123');

    expect(result).toEqual({ accessToken: 'access-jwt', refreshToken: 'refresh-tok' });
    const stored = h.users.create.mock.calls[0]?.[0] as { passwordHash: string };
    expect(stored.passwordHash).not.toBe('password123');
    expect(await argon2.verify(stored.passwordHash, 'password123')).toBe(true);
  });

  it('makes the first registered account an admin and later accounts users (TEST-016)', async () => {
    h.users.count.mockResolvedValueOnce(0);
    await h.service.register('first@b.com', 'password123');
    expect((h.users.create.mock.calls[0]?.[0] as { role: string }).role).toBe('admin');

    h.users.count.mockResolvedValueOnce(1);
    await h.service.register('second@b.com', 'password123');
    expect((h.users.create.mock.calls[1]?.[0] as { role: string }).role).toBe('user');
  });

  it('blocks public registration when disabled, but the bootstrap admin still succeeds (TEST-017)', async () => {
    h.settings.get.mockResolvedValue(false);

    h.users.count.mockResolvedValueOnce(2);
    await expect(h.service.register('x@b.com', 'password123')).rejects.toBeInstanceOf(ForbiddenException);

    h.users.count.mockResolvedValueOnce(0);
    await expect(h.service.register('first@b.com', 'password123')).resolves.toMatchObject({
      accessToken: 'access-jwt',
    });
  });

  it('rejects registration when the email already exists', async () => {
    h.users.findByEmail.mockResolvedValue({ id: 1 });
    await expect(h.service.register('a@b.com', 'password123')).rejects.toBeInstanceOf(ConflictException);
  });
});

/** Login, disabled-account block (TEST-018), refresh rotation, and registration status. */
describe('AuthService login/refresh/status', () => {
  let h: ReturnType<typeof setup>;
  beforeEach(() => {
    h = setup();
  });

  it('rejects login with a wrong password', async () => {
    const passwordHash = await argon2.hash('correct-pass', { type: argon2.argon2id });
    h.users.findByEmail.mockResolvedValue({ id: 1, role: 'user', isActive: true, passwordHash });
    await expect(h.service.login('a@b.com', 'wrong-pass')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('logs in with the correct password and returns a token pair', async () => {
    const passwordHash = await argon2.hash('correct-pass', { type: argon2.argon2id });
    h.users.findByEmail.mockResolvedValue({ id: 1, role: 'user', isActive: true, passwordHash });

    expect((await h.service.login('a@b.com', 'correct-pass')).accessToken).toBe('access-jwt');
  });

  it('denies login to a disabled account even with the correct password (TEST-018)', async () => {
    const passwordHash = await argon2.hash('correct-pass', { type: argon2.argon2id });
    h.users.findByEmail.mockResolvedValue({ id: 1, role: 'user', isActive: false, passwordHash });

    await expect(h.service.login('a@b.com', 'correct-pass')).rejects.toThrow('Account is disabled');
  });

  it('reports registration status (open while empty, then follows the flag)', async () => {
    h.users.count.mockResolvedValueOnce(0);
    expect(await h.service.registrationStatus()).toEqual({ registrationEnabled: true, hasUsers: false });

    h.users.count.mockResolvedValueOnce(3);
    h.settings.get.mockResolvedValueOnce(false);
    expect(await h.service.registrationStatus()).toEqual({ registrationEnabled: false, hasUsers: true });
  });

  it('refreshes by rotating the token and issuing a new pair in the same family', async () => {
    h.refreshTokens.rotate.mockResolvedValue({ userId: 1, familyId: 'fam-1' });
    h.users.findById.mockResolvedValue({ id: 1, role: 'user' });

    const result = await h.service.refresh('old-refresh');

    expect(h.refreshTokens.rotate).toHaveBeenCalledWith('old-refresh');
    expect(h.refreshTokens.issue).toHaveBeenCalledWith(1, undefined, 'fam-1');
    expect(result.refreshToken).toBe('refresh-tok');
  });
});
