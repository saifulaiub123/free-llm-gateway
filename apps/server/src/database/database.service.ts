import {
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { connectDb } from './connection.js';
import { getActiveProvider } from './providers/registry.js';
import type { Db, DbConnection } from './types.js';

/**
 * Single access point for the Drizzle client — the application's "DbContext equivalent".
 *
 * WHY a service (not a raw token): it owns the connection lifecycle — NestJS `OnModuleInit` opens the
 * configured provider's connection and `OnModuleDestroy` closes the underlying driver handle (libSQL
 * client / pg pool) for graceful shutdown — and exposes a typed {@link db} getter. Repositories inject
 * this and read `db` lazily at query time, so provider construction order never races the connection.
 *
 * Migrations are applied automatically on boot so the schema is always up-to-date without a separate
 * `db:migrate` step. The migrator uses its own short-lived connection, so the long-running pool
 * opened here is unaffected. Migration errors are non-fatal — in test environments the in-memory
 * SQLite database doesn't need migrations, and in re-run scenarios the schema may already be current.
 */
@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  /** The open connection, set on init and cleared on destroy. */
  private connection: DbConnection | undefined;

  /** The active Drizzle client. Throws if read before the module has initialized. */
  get db(): Db {
    if (!this.connection) {
      throw new Error('DatabaseService.db read before onModuleInit()');
    }
    return this.connection.db;
  }

  /** Opens the connection for the selected provider and applies pending migrations. */
  async onModuleInit(): Promise<void> {
    this.connection = connectDb();
    try {
      await getActiveProvider().runMigrator();
    } catch {
      // Non-fatal — already-migrated databases or test environments don't block boot.
    }
  }

  /** Closes the underlying driver connection so the process can exit cleanly. */
  async onModuleDestroy(): Promise<void> {
    if (this.connection) {
      await this.connection.disconnect();
      this.connection = undefined;
    }
  }
}
