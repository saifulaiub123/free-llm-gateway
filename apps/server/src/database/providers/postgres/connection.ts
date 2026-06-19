import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import type { Db, DbConnection, Schema } from '../../types.js';
import { resolvePostgresUrl } from './paths.js';

/**
 * Opens a PostgreSQL-backed connection from `DB_URL` (or `PG*` env vars). `schema` is passed in by the
 * common connection factory so this module never imports the schema barrel (avoids a cycle). Returns
 * a `disconnect` that ends the pool for graceful shutdown.
 */
export const connectPostgres = (schema: Schema): DbConnection => {
  const connectionString = resolvePostgresUrl();
  // exactOptionalPropertyTypes: only pass connectionString when defined/non-empty.
  const pool = connectionString ? new Pool({ connectionString }) : new Pool();
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
