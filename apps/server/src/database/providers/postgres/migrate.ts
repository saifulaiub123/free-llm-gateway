import { fileURLToPath } from 'node:url';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { migrate as migratePg } from 'drizzle-orm/node-postgres/migrator';
import { dbSchema } from '../../common/env.js';
import { createPostgresPool } from './paths.js';

/** Default committed migrations folder for PostgreSQL (`src/database/migrations/postgres`). */
const defaultMigrationsFolder = (): string =>
  fileURLToPath(new URL('../../migrations/postgres', import.meta.url));

/**
 * Applies PostgreSQL migrations. Ensures the configured schema exists first so prefixed tables land
 * in the right namespace, then runs Drizzle's migrator (the pool pins `search_path` to `DB_SCHEMA`)
 * and releases the pool.
 */
export const runPostgresMigrator = async (migrationsFolder?: string): Promise<void> => {
  const folder = migrationsFolder ?? defaultMigrationsFolder();
  const pool = createPostgresPool();
  try {
    // WHY before migrating: prefixed tables target DB_SCHEMA, which must exist up front.
    await pool.query(`CREATE SCHEMA IF NOT EXISTS "${dbSchema()}"`);
    await migratePg(drizzlePg(pool), { migrationsFolder: folder });
  } finally {
    await pool.end();
  }
};
