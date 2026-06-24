import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { AdapterRegistry } from '@gateway/provider-adapters';
import { ProvidersService } from './providers.service.js';
import type { EncryptionService } from '../../common/crypto/encryption.service.js';
import type { ProviderRepository } from './provider.repository.js';
import type { UserProviderKeyRepository } from './user-provider-key.repository.js';
import type { UserModelRepository } from '../models/user-model.repository.js';

/** Assembles a ProvidersService with mocked collaborators and exposes the mocks for assertions. */
function build(options: { valid?: boolean; providerExists?: boolean } = {}) {
  const validateKey = vi.fn().mockResolvedValue(options.valid ?? true);
  const registry = { get: vi.fn().mockReturnValue({ validateKey }) } as unknown as AdapterRegistry;
  const encrypt = vi.fn().mockReturnValue('cipher-text');
  const encryption = { encrypt } as unknown as EncryptionService;
  const create = vi.fn().mockResolvedValue({
    id: 1,
    providerId: 7,
    label: null,
    status: 'healthy',
    lastCheckedAt: null,
    createdAt: new Date(),
  });
  const listByUser = vi.fn().mockResolvedValue([]);
  const removeOwned = vi.fn().mockResolvedValue(true);
  const keys = { create, listByUser, removeOwned } as unknown as UserProviderKeyRepository;
  const getByKey = vi
    .fn()
    .mockResolvedValue(options.providerExists === false ? undefined : { id: 7, adapterType: 'groq' });
  const catalog = { getByKey, listAll: vi.fn() } as unknown as ProviderRepository;
  const removeByProviderKey = vi.fn().mockResolvedValue(undefined);
  const userModels = { removeByProviderKey } as unknown as UserModelRepository;
  return {
    service: new ProvidersService(registry, encryption, keys, catalog, userModels),
    encrypt,
    create,
    removeOwned,
    removeByProviderKey,
  };
}

describe('ProvidersService.addKey', () => {
  it('validates upstream, stores ciphertext (not plaintext), and returns metadata without the key', async () => {
    const { service, encrypt, create } = build({ valid: true });

    const result = await service.addKey(5, 'groq', 'sk-secret', 'work');

    expect(encrypt).toHaveBeenCalledWith('sk-secret');
    const createdArg = create.mock.calls[0]![0] as { encryptedKey: string; userId: number };
    expect(createdArg.encryptedKey).toBe('cipher-text'); // ciphertext stored, never the plaintext
    expect(createdArg.userId).toBe(5);
    expect(result).not.toHaveProperty('encryptedKey');
    expect(result.id).toBe(1);
  });

  it('rejects a key the adapter refuses (400) and persists nothing', async () => {
    const { service, create } = build({ valid: false });

    await expect(service.addKey(5, 'groq', 'bad-key')).rejects.toBeInstanceOf(BadRequestException);
    expect(create).not.toHaveBeenCalled();
  });

  it('throws NotFound for an unknown provider', async () => {
    const { service, create } = build({ providerExists: false });

    await expect(service.addKey(5, 'nope', 'sk')).rejects.toBeInstanceOf(NotFoundException);
    expect(create).not.toHaveBeenCalled();
  });
});

describe('ProvidersService.removeKey', () => {
  it('delegates to the owner-scoped repository removal', async () => {
    const { service, removeOwned } = build();
    expect(await service.removeKey(5, 3)).toBe(true);
    expect(removeOwned).toHaveBeenCalledWith(5, 3);
  });
});
