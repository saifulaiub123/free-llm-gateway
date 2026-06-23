import { describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { TokensService } from './tokens.service.js';
import type { ApiTokenRepository } from './api-token.repository.js';

describe('TokensService', () => {
  it('issues a sqr-llm- token and persists only its SHA-256 hash', async () => {
    const create = vi.fn().mockResolvedValue(undefined);
    const repository = { create } as unknown as ApiTokenRepository;
    const service = new TokensService(repository);

    const { token, prefix } = await service.create(7, 'ci');

    expect(token.startsWith('sqr-llm-')).toBe(true);
    expect(prefix).toBe(token.slice(0, 12));

    const arg = create.mock.calls[0]![0] as {
      userId: number;
      name: string;
      prefix: string;
      tokenHash: string;
    };
    expect(arg).toMatchObject({ userId: 7, name: 'ci', prefix });
    expect(arg.tokenHash).toMatch(/^[0-9a-f]{64}$/); // SHA-256 hex digest
    expect(arg.tokenHash).toBe(createHash('sha256').update(token).digest('hex'));
    expect(arg.tokenHash).not.toBe(token); // never persists the plaintext
  });

  it('delegates list and revoke scoped by userId', async () => {
    const listByUser = vi.fn().mockResolvedValue([]);
    const revokeOwned = vi.fn().mockResolvedValue(true);
    const repository = { listByUser, revokeOwned } as unknown as ApiTokenRepository;
    const service = new TokensService(repository);

    await service.list(7);
    expect(listByUser).toHaveBeenCalledWith(7);

    await service.revoke(7, 3);
    expect(revokeOwned).toHaveBeenCalledWith(7, 3);
  });
});
