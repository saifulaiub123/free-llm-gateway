import { Injectable, NotFoundException } from '@nestjs/common';
import { AdapterRegistry } from '@gateway/provider-adapters';
import { EncryptionService } from '../../common/crypto/encryption.service.js';
import { UserProviderKeyRepository } from '../providers/user-provider-key.repository.js';
import { ModelRepository } from './model.repository.js';
import { UserModelRepository } from './user-model.repository.js';
import { ModelMetadataService } from './model-metadata.service.js';

/** Result of a fetch-models run: total models persisted and how many are free. */
export interface FetchModelsResult {
  fetched: number;
  free: number;
}

/** Orchestrates on-demand model discovery + the per-user model catalog (TASK-030). */
@Injectable()
export class ModelsService {
  constructor(
    private readonly registry: AdapterRegistry,
    private readonly encryption: EncryptionService,
    private readonly keys: UserProviderKeyRepository,
    private readonly models: ModelRepository,
    private readonly userModels: UserModelRepository,
    private readonly metadata: ModelMetadataService,
  ) {}

  /**
   * Discovers a provider's models for a user's key and upserts them, enabling free ones by default.
   *
   * WHY enable-free-by-default: the product's promise is free-first usage, so a new key should be
   * immediately useful without manual toggling. The plaintext key is decrypted only in memory here.
   */
  async fetchModelsForKey(userId: number, keyId: number): Promise<FetchModelsResult> {
    const key = await this.keys.getOwned(userId, keyId);
    if (!key) {
      throw new NotFoundException('Provider key not found');
    }
    const adapter = this.registry.get(key.adapterType);
    const discovered = adapter.classifyFreeModels(
      await adapter.fetchModels(this.encryption.decrypt(key.encryptedKey)),
    );
    const merged = this.metadata.applyBaseline(key.providerId, discovered);
    const saved = await this.models.upsertMany(key.providerId, merged);
    await this.userModels.ensureRows(userId, saved);
    return { fetched: saved.length, free: saved.filter((model) => model.isFree).length };
  }
}
