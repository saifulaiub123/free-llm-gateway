import { describe, expect, it, vi } from 'vitest';
import type { AdapterRegistry } from '@gateway/provider-adapters';
import { KeyHealthProbeService } from './key-health-probe.service.js';
import type { EncryptionService } from '../../common/crypto/encryption.service.js';
import type { UserProviderKeyRepository } from '../providers/user-provider-key.repository.js';

/** Builds the probe with a single stored key whose adapter validates to `valid`. */
function build(valid: boolean) {
  const listAllWithProvider = vi
    .fn()
    .mockResolvedValue([{ id: 1, encryptedKey: 'cipher', adapterType: 'groq' }]);
  const updateStatus = vi.fn().mockResolvedValue(undefined);
  const keys = { listAllWithProvider, updateStatus } as unknown as UserProviderKeyRepository;
  const registry = {
    has: vi.fn().mockReturnValue(true),
    get: vi.fn().mockReturnValue({ validateKey: vi.fn().mockResolvedValue(valid) }),
  } as unknown as AdapterRegistry;
  const encryption = { decrypt: vi.fn().mockReturnValue('plaintext-key') } as unknown as EncryptionService;
  return { service: new KeyHealthProbeService(keys, registry, encryption), updateStatus };
}

describe('KeyHealthProbeService', () => {
  it('marks a key invalid when its adapter rejects it', async () => {
    const { service, updateStatus } = build(false);
    await service.probeAll();
    expect(updateStatus).toHaveBeenCalledWith(1, 'invalid');
  });

  it('marks a key healthy when its adapter accepts it', async () => {
    const { service, updateStatus } = build(true);
    await service.probeAll();
    expect(updateStatus).toHaveBeenCalledWith(1, 'healthy');
  });
});
