import Database from 'better-sqlite3';
import { drizzle as drizzleSqlite, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzlePg, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { resolveDialect } from './table-factory.js';
import * as schema from './schema/index.js';

/** The full set of Drizzle schema entities (grows as later phases add tables). */
export type Schema = typeof schema;

/**
 * Driver-agnostic database handle the rest of the app depends on.
 *
 * WHY a union (not a single type): the PostgreSQL and SQLite Drizzle clients are
 * distinct types, but every consumer programs against this abstract `Db` so a
 * dialect switch is a config change, never a code change.
 */
export type Db = NodePgDatabase<Schema> | BetterSQLite3Database<Schema>;

/** Fallback SQLite location for zero-config development. */
const DEFAULT_SQLITE_URL = 'file:./data/llm-gateway.db';

/** Builds a PostgreSQL-backed Drizzle client from `DB_URL`. */
const createPostgresDb = (): Db => {
  const connectionString = process.env.DB_URL;
  // exactOptionalPropertyTypes: only pass connectionString when defined.
  const pool = connectionString ? new Pool({ connectionString }) : new Pool();
  return drizzlePg(pool, { schema });
};

/**
 * Builds a SQLite-backed Drizzle client. Strips a leading `file:` so both
 * `file:./data/gateway.db` and a bare path work, and supports `:memory:`.
 */
const createSqliteDb = (): Db => {
  const url = process.env.DB_URL ?? DEFAULT_SQLITE_URL;
  const sqlite = new Database(url.replace(/^file:/, ''));
  return drizzleSqlite(sqlite, { schema });
};

/**
 * Creates a Drizzle client for the configured dialect.
 *
 * WHY a factory: the rest of the app depends on the abstract {@link Db} type, never
 * on a concrete driver, so switching Postgres <-> SQLite is a `DB_DRIVER` config
 * change with zero code changes. A new dialect plugs in via one branch here, mirroring
 * the table-factory dialect registry (Open/Closed — GUD-008 / PAT-006).
 */
export function createDb(): Db {
  return resolveDialect() === 'postgres' ? createPostgresDb() : createSqliteDb();
}
