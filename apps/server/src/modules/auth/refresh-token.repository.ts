import { Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { refreshTokens, DatabaseService } from '../../database/index.js';
import { BaseRepository } from '../../common/db/base.repository.js';

/** Persistence for hashed `refresh_tokens` (lookup by hash, single + family revocation). */
@Injectable()
export class RefreshTokenRepository extends BaseRepository<typeof refreshTokens> {
  constructor(database: DatabaseService) {
    super(database, refreshTokens, false); // baseColumns only -> not soft-deletable
  }

  /** Finds a refresh token by its SHA-256 hash. */
  async findByHash(tokenHash: string): Promise<typeof refreshTokens.$inferSelect | undefined> {
    const rows = await this.exec()
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .limit(1);
    return rows[0];
  }

  /** Marks a single token revoked (sets `revokedAt = now`). */
  async revoke(id: number): Promise<void> {
    await this.exec()
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, id));
  }

  /** Revokes every still-active token in a family (token-reuse containment). */
  async revokeFamily(familyId: string): Promise<void> {
    await this.exec()
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.familyId, familyId), isNull(refreshTokens.revokedAt)));
  }
}
