import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import { migrate as migrateSqlite } from 'drizzle-orm/better-sqlite3/migrator';
import { resolveSqliteFilePath } from './paths.js';

/** Default committed migrations folder for SQLite (`packages/db/migrations/sqlite`). */
const defaultMigrationsFolder = (): string =>
  fileURLToPath(new URL('../../../migrations/sqlite', import.meta.url));

/**
 * Applies SQLite migrations against the configured database file. SQLite has no schemas, so there is
 * no pre-migration namespace step. `migrationsFolder` can be overridden for tests.
 */
export const runSqliteMigrator = async (migrationsFolder?: string): Promise<void> => {
  const folder = migrationsFolder ?? defaultMigrationsFolder();
  const sqlite = new Database(resolveSqliteFilePath());
  try {
    migrateSqlite(drizzleSqlite(sqlite), { migrationsFolder: folder });
  } finally {
    sqlite.close();
  }
};
