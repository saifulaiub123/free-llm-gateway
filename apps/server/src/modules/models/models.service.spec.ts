import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import type { AdapterRegistry, DiscoveredModel } from '@gateway/provider-adapters';
import { ModelsService } from './models.service.js';
import { ModelMetadataService } from './model-metadata.service.js';
import type { EncryptionService } from '../../common/crypto/encryption.service.js';
import type { UserProviderKeyRepository } from '../providers/user-provider-key.repository.js';
import type { ProviderRepository } from '../providers/provider.repository.js';
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

function build(options: { owned?: boolean; providerExists?: boolean; updateOwned?: unknown } = {}) {
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
      options.owned === false
        ? undefined
        : { id: 9, providerId: 3, encryptedKey: 'cipher', adapterType: 'groq' },
    );
  const keys = { getOwned } as unknown as UserProviderKeyRepository;
  const upsertMany = vi.fn().mockResolvedValue([
    { id: 1, modelId: 'a', isFree: true },
    { id: 2, modelId: 'b', isFree: true },
    { id: 3, modelId: 'c', isFree: false },
  ]);
  const findByIds = vi.fn().mockResolvedValue([]);
  const models = { upsertMany, findByIds } as unknown as ModelRepository;
  const ensureRows = vi.fn().mockResolvedValue(undefined);
  const updateResult = 'updateOwned' in options ? options.updateOwned : { id: 7, enabled: false };
  const updateOwned = vi.fn().mockResolvedValue(updateResult);
  const createCustom = vi.fn().mockResolvedValue({
    id: 11,
    customProviderId: 2,
    enabled: true,
    isCustom: true,
    overrides: '{"modelId":"my-llm","displayName":"My LLM"}',
  });
  const removeCustomOwned = vi.fn().mockResolvedValue(true);
  const listByUser = vi.fn().mockResolvedValue([]);
  const userModels = {
    ensureRows,
    updateOwned,
    createCustom,
    removeCustomOwned,
    listByUser,
  } as unknown as UserModelRepository;
  const getByKey = vi
    .fn()
    .mockResolvedValue(options.providerExists === false ? undefined : { id: 2, key: 'custom' });
  const catalog = { getByKey } as unknown as ProviderRepository;
  const service = new ModelsService(
    registry,
    encryption,
    keys,
    models,
    userModels,
    new ModelMetadataService(),
    catalog,
  );
  return { service, upsertMany, ensureRows, updateOwned, createCustom, removeCustomOwned };
}

describe('ModelsService.fetchModelsForKey', () => {
  it('discovers, upserts (with provider id), ensures user rows, and returns counts', async () => {
    const { service, upsertMany, ensureRows } = build({ owned: true });

    const result = await service.fetchModelsForKey(5, 9);

    expect(upsertMany).toHaveBeenCalledWith(
      3,
      expect.arrayContaining([expect.objectContaining({ modelId: 'a', intelligenceScore: 50 })]),
    );
    expect(ensureRows).toHaveBeenCalledWith(5, expect.any(Array));
    expect(result).toEqual({ fetched: 3, free: 2 });
  });

  it('throws 404 for a key the user does not own', async () => {
    const { service } = build({ owned: false });
    await expect(service.fetchModelsForKey(5, 9)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('ModelsService management', () => {
  it('updates a user model the caller owns', async () => {
    const { service, updateOwned } = build({ updateOwned: { id: 7, enabled: false } });
    const result = await service.updateUserModel(5, 7, { enabled: false });
    expect(updateOwned).toHaveBeenCalledWith(5, 7, { enabled: false });
    expect(result).toEqual({ id: 7, enabled: false });
  });

  it('throws 404 when updating a model the caller does not own', async () => {
    const { service } = build({ updateOwned: undefined });
    await expect(service.updateUserModel(5, 7, { enabled: true })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('adds a custom model, storing details in overrides', async () => {
    const { service, createCustom } = build();
    const view = await service.addCustomModel(5, {
      providerKey: 'custom',
      modelId: 'my-llm',
      displayName: 'My LLM',
    });
    const args = createCustom.mock.calls[0]![0] as { customProviderId: number; overrides: string };
    expect(args.customProviderId).toBe(2);
    expect(JSON.parse(args.overrides)).toMatchObject({ modelId: 'my-llm', displayName: 'My LLM' });
    expect(view.isCustom).toBe(true);
  });

  it('throws 404 when adding a custom model for an unknown provider', async () => {
    const { service } = build({ providerExists: false });
    await expect(
      service.addCustomModel(5, { providerKey: 'nope', modelId: 'm', displayName: 'M' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('delegates custom removal to the owner-scoped repository', async () => {
    const { service, removeCustomOwned } = build();
    expect(await service.removeCustomModel(5, 11)).toBe(true);
    expect(removeCustomOwned).toHaveBeenCalledWith(5, 11);
  });
});
