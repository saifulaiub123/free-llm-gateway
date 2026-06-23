import { createClient } from '@libsql/client';
import { drizzle as drizzleLibsql } from 'drizzle-orm/libsql';
import type { DbConnection, Schema } from '../../types.js';
import { ensureParentDir, resolveSqliteConnectionUrl, resolveSqliteFilePath } from './paths.js';

/**
 * Opens a libSQL-backed connection at the configured URL (a file path or `:memory:`).
 *
 * WHY libSQL (async) instead of better-sqlite3 (sync): both supported providers now share one
 * asynchronous query API, so a single repository body runs on SQLite and PostgreSQL alike. Returns a
 * `disconnect` that closes the libSQL client for graceful shutdown. `schema` is passed in by the
 * common connection factory so this module never imports `schema/` itself (avoiding an import cycle).
 */
export const connectSqlite = (schema: Schema): DbConnection => {
  ensureParentDir(resolveSqliteFilePath()); // create ./data (or any configured dir) so opening never fails
  const client = createClient({ url: resolveSqliteConnectionUrl() });
  const db = drizzleLibsql(client, { schema });
  return {
    db,
    disconnect: async (): Promise<void> => {
      client.close();
    },
  };
};
