import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AdapterRegistry } from '@gateway/provider-adapters';
import { EncryptionService } from '../../common/crypto/encryption.service.js';
import { ProviderRepository } from './provider.repository.js';
import {
  UserProviderKeyRepository,
  type ProviderKeyMetadata,
} from './user-provider-key.repository.js';
import { providers } from '../../database/index.js';
import { UserModelRepository } from '../models/user-model.repository.js';

/**
 * Provider catalog + per-user key management (TASK-026).
 *
 * WHY validate-then-encrypt-then-store: a key is verified with its adapter BEFORE persisting, so we
 * never store a dead credential; it is then AES-256-GCM-encrypted at rest. Listing returns metadata
 * only — the ciphertext (let alone the plaintext) never leaves this service.
 */
@Injectable()
export class ProvidersService {
  constructor(
    private readonly registry: AdapterRegistry,
    private readonly encryption: EncryptionService,
    private readonly keys: UserProviderKeyRepository,
    private readonly catalog: ProviderRepository,
    private readonly userModels: UserModelRepository,
  ) {}

  /** Returns the global provider catalog. */
  listCatalog(): Promise<(typeof providers.$inferSelect)[]> {
    return this.catalog.listAll();
  }

  /**
   * Validates a key with its provider adapter, then stores it encrypted. Multiple keys per
   * `(user, provider)` are allowed (the key pool). Returns metadata only.
   */
  async addKey(
    userId: number,
    providerKey: string,
    apiKey: string,
    label?: string,
  ): Promise<ProviderKeyMetadata> {
    const provider = await this.catalog.getByKey(providerKey);
    if (!provider) {
      throw new NotFoundException(`Unknown provider "${providerKey}"`);
    }
    const adapter = this.registry.get(provider.adapterType);
    const isValid = await adapter.validateKey(apiKey).catch(() => false);
    if (!isValid) {
      throw new BadRequestException('Provider rejected the key');
    }
    const created = await this.keys.create({
      userId,
      providerId: provider.id,
      label: label ?? null,
      encryptedKey: this.encryption.encrypt(apiKey),
      status: 'healthy',
    });
    // Return metadata only — never echo the ciphertext.
    return {
      id: created.id,
      providerId: created.providerId,
      label: created.label,
      status: created.status,
      lastCheckedAt: created.lastCheckedAt,
      createdAt: created.createdAt,
    };
  }

  /** Lists the user's keys (metadata only). */
  listKeys(userId: number): Promise<ProviderKeyMetadata[]> {
    return this.keys.listByUser(userId);
  }

  /**
   * Removes (soft-deletes) one of the user's keys, along with any non-custom model rows that
   * were scoped to that key (KSM-009). Returns whether a matching key was removed.
   */
  async removeKey(userId: number, id: number): Promise<boolean> {
    const removed = await this.keys.removeOwned(userId, id);
    if (removed) {
      await this.userModels.removeByProviderKey(userId, id);
    }
    return removed;
  }
}
