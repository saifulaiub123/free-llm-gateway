import { Injectable } from '@nestjs/common';
import type { InferInsertModel } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service.js';
import { BaseRepository } from '../../common/db/base.repository.js';
import { appLogs } from '../../database/schema/app-logs.js';

/** Insert shape for the `app_logs` table. */
export type CreateAppLog = InferInsertModel<typeof appLogs>;

/**
 * Thin data-mapper over the `app_logs` table.
 *
 * WHY a concrete repository: the service could write directly via `BaseRepository`, but a dedicated
 * repository keeps the persistence contract explicit and makes it easy to add app-log-specific
 * queries (e.g. `listUnresolved`, `markResolved`) later without touching the service.
 */
@Injectable()
export class AppLogRepository extends BaseRepository<typeof appLogs> {
  constructor(database: DatabaseService) {
    super(database, appLogs, false); // no soft-delete — append-only ledger
  }

  /**
   * Persists a single app-log row.
   *
   * WHY a named method (not `create()` from `BaseRepository`): the base class returns the created
   * row, but for an append-only log we don't need the return value. Keeping the interface narrow
   * signals "fire-and-forget" to callers.
   */
  async write(row: CreateAppLog): Promise<void> {
    await this.create(row);
  }
}
