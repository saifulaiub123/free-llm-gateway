import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import { migrate as migrateSqlite } from 'drizzle-orm/better-sqlite3/migrator';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { migrate as migratePg } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { resolveDialect, targetSchema, type SupportedDialect } from './table-factory.js';
import { resolveSqliteFilePath } from './db-paths.js';

/** Resolves the committed migrations folder for a dialect, relative to this file. */
const folderForDialect = (dialect: SupportedDialect): string =>
  fileURLToPath(new URL(`../migrations/${dialect}`, import.meta.url));

/**
 * Applies PostgreSQL migrations. Ensures the configured schema exists first so prefixed tables
 * land in the right namespace, then runs Drizzle's migrator and releases the pool.
 */
const runPostgresMigrations = async (migrationsFolder: string): Promise<void> => {
  const connectionString = process.env.DB_URL;
  const pool = connectionString ? new Pool({ connectionString }) : new Pool();
  try {
    // WHY before migrating: prefixed tables target DB_SCHEMA, which must exist up front.
    await pool.query(`CREATE SCHEMA IF NOT EXISTS "${targetSchema()}"`);
    await migratePg(drizzlePg(pool), { migrationsFolder });
  } finally {
    await pool.end();
  }
};

/** Applies SQLite migrations against the configured database file. SQLite has no schemas. */
const runSqliteMigrations = (migrationsFolder: string): void => {
  const sqlite = new Database(resolveSqliteFilePath());
  try {
    migrateSqlite(drizzleSqlite(sqlite), { migrationsFolder });
  } finally {
    sqlite.close();
  }
};

/**
 * Applies all pending migrations for the configured dialect.
 *
 * WHY a single entrypoint: deployment and tests run one command regardless of driver. The dialect
 * is resolved from `DB_DRIVER`, and each branch owns its own short-lived connection so the migrator
 * never shares the app's pooled client. `migrationsFolder` can be overridden for tests.
 */
export async function runMigrations(migrationsFolder?: string): Promise<void> {
  const dialect = resolveDialect();
  const folder = migrationsFolder ?? folderForDialect(dialect);
  if (dialect === 'postgres') {
    await runPostgresMigrations(folder);
    return;
  }
  runSqliteMigrations(folder);
}

// When executed directly (`pnpm db:migrate`), run migrations and surface failures as a non-zero exit.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runMigrations().catch((error: unknown) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}
