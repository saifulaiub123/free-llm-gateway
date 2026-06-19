import { fileURLToPath } from 'node:url';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { migrate as migratePg } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { dbSchema } from '../../common/env.js';
import { resolvePostgresUrl } from './paths.js';

/** Default committed migrations folder for PostgreSQL (`src/database/migrations/postgres`). */
const defaultMigrationsFolder = (): string =>
  fileURLToPath(new URL('../../migrations/postgres', import.meta.url));

/**
 * Applies PostgreSQL migrations. Ensures the configured schema exists first so prefixed tables land
 * in the right namespace, then runs Drizzle's migrator and releases the pool.
 */
export const runPostgresMigrator = async (migrationsFolder?: string): Promise<void> => {
  const folder = migrationsFolder ?? defaultMigrationsFolder();
  const connectionString = resolvePostgresUrl();
  const pool = connectionString ? new Pool({ connectionString }) : new Pool();
  try {
    // WHY before migrating: prefixed tables target DB_SCHEMA, which must exist up front.
    await pool.query(`CREATE SCHEMA IF NOT EXISTS "${dbSchema()}"`);
    await migratePg(drizzlePg(pool), { migrationsFolder: folder });
  } finally {
    await pool.end();
  }
};
