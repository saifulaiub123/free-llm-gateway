import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { refreshTokens, type Db } from '@gateway/db';
import { DB } from '../../database/database.module.js';
import { BaseRepository } from '../../common/db/base.repository.js';

/** Persistence for hashed `refresh_tokens` (lookup by hash, single + family revocation). */
@Injectable()
export class RefreshTokenRepository extends BaseRepository<typeof refreshTokens> {
  constructor(@Inject(DB) db: Db) {
    super(db, refreshTokens, false); // baseColumns only -> not soft-deletable
  }

  /** Finds a refresh token by its SHA-256 hash. */
  async findByHash(tokenHash: string): Promise<typeof refreshTokens.$inferSelect | undefined> {
    return this.exec()
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .get();
  }

  /** Marks a single token revoked (sets `revokedAt = now`). */
  async revoke(id: number): Promise<void> {
    this.exec()
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, id))
      .run();
  }

  /** Revokes every still-active token in a family (token-reuse containment). */
  async revokeFamily(familyId: string): Promise<void> {
    this.exec()
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.familyId, familyId), isNull(refreshTokens.revokedAt)))
      .run();
  }
}
