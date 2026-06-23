import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { providers, DatabaseService } from '../../database/index.js';
import { BaseRepository } from '../../common/db/base.repository.js';

/** Persistence for the global `providers` catalog (not user-scoped, not soft-deletable). */
@Injectable()
export class ProviderRepository extends BaseRepository<typeof providers> {
  constructor(database: DatabaseService) {
    super(database, providers, false); // catalog composes baseColumns only
  }

  /** Looks up a catalog provider by its stable `key` (e.g. `groq`), or `undefined`. */
  async getByKey(key: string): Promise<typeof providers.$inferSelect | undefined> {
    const rows = await this.exec().select().from(providers).where(eq(providers.key, key)).limit(1);
    return rows[0];
  }

  /** Returns the full catalog. */
  listAll(): Promise<(typeof providers.$inferSelect)[]> {
    return this.findAll();
  }

  /**
   * Idempotently inserts catalog rows, skipping any whose `key` already exists.
   *
   * WHY `onConflictDoNothing`: the seeder runs on every boot, so re-running must be a no-op rather
   * than erroring or duplicating. Works on both libSQL and node-postgres.
   */
  async seedMissing(rows: (typeof providers.$inferInsert)[]): Promise<void> {
    for (const row of rows) {
      await this.exec().insert(providers).values(row).onConflictDoNothing({ target: providers.key });
    }
  }
}
