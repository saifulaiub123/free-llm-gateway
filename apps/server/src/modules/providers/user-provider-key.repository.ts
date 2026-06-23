import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { providers, userProviderKeys, DatabaseService } from '../../database/index.js';
import { BaseRepository } from '../../common/db/base.repository.js';

/** Status values a key can hold, maintained by the health probe. */
export type KeyStatus = 'healthy' | 'rate_limited' | 'invalid' | 'error';

/** Metadata view of a user's provider key — deliberately EXCLUDES `encryptedKey`. */
export type ProviderKeyMetadata = Pick<
  typeof userProviderKeys.$inferSelect,
  'id' | 'providerId' | 'label' | 'status' | 'lastCheckedAt' | 'createdAt'
>;

/** A key paired with its provider's adapter type, for the health probe to resolve the adapter. */
export interface ProbeableKey {
  id: number;
  encryptedKey: string;
  adapterType: string;
}

/** An owned key resolved for model discovery: provider id + ciphertext + adapter type. */
export interface OwnedKey {
  id: number;
  providerId: number;
  encryptedKey: string;
  adapterType: string;
}

/** Persistence for `user_provider_keys` (the encrypted per-user key pool). */
@Injectable()
export class UserProviderKeyRepository extends BaseRepository<typeof userProviderKeys> {
  constructor(database: DatabaseService) {
    super(database, userProviderKeys, true); // composes baseEntityColumns -> soft-deletable
  }

  /** Lists a user's keys as metadata only; never selects the ciphertext (SEC-006). */
  async listByUser(userId: number): Promise<ProviderKeyMetadata[]> {
    return this.exec()
      .select({
        id: userProviderKeys.id,
        providerId: userProviderKeys.providerId,
        label: userProviderKeys.label,
        status: userProviderKeys.status,
        lastCheckedAt: userProviderKeys.lastCheckedAt,
        createdAt: userProviderKeys.createdAt,
      })
      .from(userProviderKeys)
      .where(and(this.scopedToUser(userId), eq(userProviderKeys.isDeleted, false)));
  }

  /** Soft-deletes a key only when it belongs to the user (SEC-004). Returns whether a row matched. */
  async removeOwned(userId: number, id: number): Promise<boolean> {
    const rows = await this.exec()
      .update(userProviderKeys)
      .set({ isDeleted: true, modifiedAt: new Date() })
      .where(
        and(
          eq(userProviderKeys.id, id),
          this.scopedToUser(userId),
          eq(userProviderKeys.isDeleted, false),
        ),
      )
      .returning({ id: userProviderKeys.id });
    return rows.length > 0;
  }

  /**
   * Returns every active key with its provider's adapter type, for the health probe.
   *
   * WHY the join: the probe needs the `AdapterRegistry` key (the provider's `adapterType`) to resolve
   * which adapter validates each ciphertext; the key row only stores the numeric `providerId`.
   */
  async listAllWithProvider(): Promise<ProbeableKey[]> {
    return this.exec()
      .select({
        id: userProviderKeys.id,
        encryptedKey: userProviderKeys.encryptedKey,
        adapterType: providers.adapterType,
      })
      .from(userProviderKeys)
      .innerJoin(providers, eq(userProviderKeys.providerId, providers.id))
      .where(eq(userProviderKeys.isDeleted, false));
  }

  /** Updates a key's health status and stamps `last_checked_at`. */
  async updateStatus(id: number, status: KeyStatus): Promise<void> {
    await this.exec()
      .update(userProviderKeys)
      .set({ status, lastCheckedAt: new Date(), modifiedAt: new Date() })
      .where(eq(userProviderKeys.id, id));
  }

  /**
   * Resolves an owned, active key with its provider id + adapter type for model discovery.
   *
   * Returns `undefined` when the key does not exist or belongs to another user (SEC-004), so callers
   * can map that to a `404`.
   */
  async getOwned(userId: number, id: number): Promise<OwnedKey | undefined> {
    const rows = await this.exec()
      .select({
        id: userProviderKeys.id,
        providerId: userProviderKeys.providerId,
        encryptedKey: userProviderKeys.encryptedKey,
        adapterType: providers.adapterType,
      })
      .from(userProviderKeys)
      .innerJoin(providers, eq(userProviderKeys.providerId, providers.id))
      .where(
        and(
          eq(userProviderKeys.id, id),
          this.scopedToUser(userId),
          eq(userProviderKeys.isDeleted, false),
        ),
      )
      .limit(1);
    return rows[0];
  }
}
