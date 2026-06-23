import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { apiTokens, DatabaseService } from '../../database/index.js';
import { BaseRepository } from '../../common/db/base.repository.js';

/** Metadata view of an API token — deliberately excludes the secret `tokenHash`. */
export type ApiTokenMetadata = Pick<
  typeof apiTokens.$inferSelect,
  'id' | 'name' | 'prefix' | 'lastUsedAt' | 'revoked' | 'createdAt'
>;

/** Minimal identity of an active token, returned to the gateway guard for authentication. */
export type ActiveApiToken = Pick<typeof apiTokens.$inferSelect, 'id' | 'userId'>;

/** Persistence for `api_tokens`: create, list metadata, and owner-scoped revoke. */
@Injectable()
export class ApiTokenRepository extends BaseRepository<typeof apiTokens> {
  constructor(database: DatabaseService) {
    // `api_tokens` composes baseEntityColumns -> soft-deletable.
    super(database, apiTokens, true);
  }

  /**
   * Lists a user's tokens as metadata only.
   *
   * WHY an explicit projection: it never selects `tokenHash`, so the secret cannot leak through the
   * management API even by accident (SEC: no secret material in responses).
   */
  async listByUser(userId: number): Promise<ApiTokenMetadata[]> {
    return this.exec()
      .select({
        id: apiTokens.id,
        name: apiTokens.name,
        prefix: apiTokens.prefix,
        lastUsedAt: apiTokens.lastUsedAt,
        revoked: apiTokens.revoked,
        createdAt: apiTokens.createdAt,
      })
      .from(apiTokens)
      .where(and(this.scopedToUser(userId), eq(apiTokens.isDeleted, false)));
  }

  /**
   * Revokes a token only when it belongs to the caller (SEC-004 cross-user protection).
   *
   * @returns true when a matching, owned token was revoked; false otherwise (e.g. another user's id).
   */
  async revokeOwned(userId: number, id: number): Promise<boolean> {
    const rows = await this.exec()
      .update(apiTokens)
      .set({ revoked: true, modifiedAt: new Date() })
      .where(and(eq(apiTokens.id, id), this.scopedToUser(userId), eq(apiTokens.isDeleted, false)))
      .returning({ id: apiTokens.id });
    return rows.length > 0;
  }

  /**
   * Looks up a non-revoked, non-deleted token by its SHA-256 hash for gateway authentication.
   *
   * WHY a hash lookup: the plaintext is never stored, so `/v1` authentication compares the SHA-256
   * of the presented token against the stored hash. Returns only `id`/`userId` — never the hash.
   */
  async findActiveByHash(tokenHash: string): Promise<ActiveApiToken | undefined> {
    const rows = await this.exec()
      .select({ id: apiTokens.id, userId: apiTokens.userId })
      .from(apiTokens)
      .where(
        and(
          eq(apiTokens.tokenHash, tokenHash),
          eq(apiTokens.revoked, false),
          eq(apiTokens.isDeleted, false),
        ),
      )
      .limit(1);
    return rows[0];
  }

  /** Stamps `last_used_at` after a successful gateway authentication (audit / staleness signal). */
  async touchLastUsed(id: number): Promise<void> {
    await this.exec().update(apiTokens).set({ lastUsedAt: new Date() }).where(eq(apiTokens.id, id));
  }
}
