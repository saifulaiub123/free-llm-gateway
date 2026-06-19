import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import type { Db, Schema } from '../../types.js';
import { resolvePostgresUrl } from './paths.js';

/**
 * Builds a PostgreSQL-backed Drizzle client from `DB_URL` (or `PG*` env vars). `schema` is passed in
 * by the common connection factory so this module never imports the schema barrel (avoids a cycle).
 */
export const createPostgresDrizzle = (schema: Schema): Db => {
  const connectionString = resolvePostgresUrl();
  // exactOptionalPropertyTypes: only pass connectionString when defined/non-empty.
  const pool = connectionString ? new Pool({ connectionString }) : new Pool();
  return drizzlePg(pool, { schema });
};
