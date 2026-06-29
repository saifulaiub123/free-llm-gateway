import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import type { Db, DbConnection, Schema } from '../../types.js';
import { createPostgresPool } from './paths.js';

/**
 * Opens a PostgreSQL-backed connection from `DB_URL` (or `PG*` env vars). `schema` is passed in by the
 * common connection factory so this module never imports the schema barrel (avoids a cycle). The pool
 * pins `search_path` to `DB_SCHEMA` on every connection. Returns a `disconnect` that ends the pool.
 *
 * The configured schema (`DB_SCHEMA`) is auto-created on the first pool connection, so the server
 * can boot without a manual `CREATE SCHEMA` step (the pool `connect` handler runs it idempotently).
 */
export const connectPostgres = (schema: Schema): DbConnection => {
  const pool = createPostgresPool();
  // Cast to the canonical libSQL-typed `Db`: node-postgres shares the same async query-builder
  // surface the repositories use, so the substitution is runtime-sound (PAT-009).
  const db = drizzlePg(pool, { schema }) as unknown as Db;
  return {
    db,
    disconnect: async (): Promise<void> => {
      await pool.end();
    },
  };
};
