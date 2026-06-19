import { createClient } from '@libsql/client';
import { drizzle as drizzleLibsql } from 'drizzle-orm/libsql';
import type { Db, Schema } from '../../types.js';
import { ensureParentDir, resolveSqliteConnectionUrl, resolveSqliteFilePath } from './paths.js';

/**
 * Builds a libSQL-backed Drizzle client at the configured URL (a file path or `:memory:`).
 *
 * WHY libSQL (async) instead of better-sqlite3 (sync): both supported drivers now share one
 * asynchronous query API, so a single repository body runs on SQLite and PostgreSQL alike. `schema`
 * is passed in by the common connection factory so this module never imports `schema/` itself (which
 * would create an import cycle: schema → registry → dialect → schema).
 */
export const createSqliteDrizzle = (schema: Schema): Db => {
  ensureParentDir(resolveSqliteFilePath()); // create ./data (or any configured dir) so opening never fails
  const client = createClient({ url: resolveSqliteConnectionUrl() });
  return drizzleLibsql(client, { schema });
};
