import { fileURLToPath } from 'node:url';
import { createClient } from '@libsql/client';
import { drizzle as drizzleLibsql } from 'drizzle-orm/libsql';
import { migrate as migrateLibsql } from 'drizzle-orm/libsql/migrator';
import { ensureParentDir, resolveSqliteConnectionUrl, resolveSqliteFilePath } from './paths.js';

/** Default committed migrations folder for SQLite (`src/database/migrations/sqlite`). */
const defaultMigrationsFolder = (): string =>
  fileURLToPath(new URL('../../migrations/sqlite', import.meta.url));

/**
 * Applies SQLite migrations against the configured libSQL database. SQLite has no schemas, so there
 * is no pre-migration namespace step. `migrationsFolder` can be overridden for tests.
 */
export const runSqliteMigrator = async (migrationsFolder?: string): Promise<void> => {
  const folder = migrationsFolder ?? defaultMigrationsFolder();
  ensureParentDir(resolveSqliteFilePath()); // create ./data (or any configured dir) so opening never fails
  const client = createClient({ url: resolveSqliteConnectionUrl() });
  try {
    await migrateLibsql(drizzleLibsql(client), { migrationsFolder: folder });
  } finally {
    client.close();
  }
};
