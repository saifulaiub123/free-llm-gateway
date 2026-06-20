import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import type { AdapterRegistry, DiscoveredModel } from '@gateway/provider-adapters';
import { ModelsService } from './models.service.js';
import { ModelMetadataService } from './model-metadata.service.js';
import type { EncryptionService } from '../../common/crypto/encryption.service.js';
import type { UserProviderKeyRepository } from '../providers/user-provider-key.repository.js';
import type { ModelRepository } from './model.repository.js';
import type { UserModelRepository } from './user-model.repository.js';

function discovered(modelId: string, isFree: boolean): DiscoveredModel {
  return {
    modelId,
    displayName: modelId,
    isFree,
    inputCostPer1m: 0,
    outputCostPer1m: 0,
    contextWindow: null,
    capabilities: { vision: false, tools: false, json: true, reasoning: false, embeddings: false },
  };
}

function build(owned = true) {
  const fetchModels = vi
    .fn()
    .mockResolvedValue([discovered('a', true), discovered('b', true), discovered('c', false)]);
  const classifyFreeModels = vi.fn((models: DiscoveredModel[]) => models);
  const registry = {
    get: vi.fn().mockReturnValue({ fetchModels, classifyFreeModels }),
  } as unknown as AdapterRegistry;
  const encryption = { decrypt: vi.fn().mockReturnValue('plaintext') } as unknown as EncryptionService;
  const getOwned = vi
    .fn()
    .mockResolvedValue(
      owned ? { id: 9, providerId: 3, encryptedKey: 'cipher', adapterType: 'groq' } : undefined,
    );
  const keys = { getOwned } as unknown as UserProviderKeyRepository;
  const upsertMany = vi.fn().mockResolvedValue([
    { id: 1, modelId: 'a', isFree: true },
    { id: 2, modelId: 'b', isFree: true },
    { id: 3, modelId: 'c', isFree: false },
  ]);
  const models = { upsertMany } as unknown as ModelRepository;
  const ensureRows = vi.fn().mockResolvedValue(undefined);
  const userModels = { ensureRows } as unknown as UserModelRepository;
  const service = new ModelsService(
    registry,
    encryption,
    keys,
    models,
    userModels,
    new ModelMetadataService(),
  );
  return { service, upsertMany, ensureRows };
}

describe('ModelsService.fetchModelsForKey', () => {
  it('discovers, upserts (with provider id), ensures user rows, and returns counts', async () => {
    const { service, upsertMany, ensureRows } = build(true);

    const result = await service.fetchModelsForKey(5, 9);

    expect(upsertMany).toHaveBeenCalledWith(
      3,
      expect.arrayContaining([expect.objectContaining({ modelId: 'a', intelligenceScore: 50 })]),
    );
    expect(ensureRows).toHaveBeenCalledWith(5, expect.any(Array));
    expect(result).toEqual({ fetched: 3, free: 2 });
  });

  it('throws 404 for a key the user does not own', async () => {
    const { service } = build(false);
    await expect(service.fetchModelsForKey(5, 9)).rejects.toBeInstanceOf(NotFoundException);
  });
});
