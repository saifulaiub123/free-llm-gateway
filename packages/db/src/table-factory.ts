import { pgTableCreator } from 'drizzle-orm/pg-core';
import { sqliteTableCreator } from 'drizzle-orm/sqlite-core';

/**
 * Reads the database naming configuration from the environment.
 *
 * WHY a getter (not module-level constants): operators set `DB_DRIVER`,
 * `DB_TABLE_PREFIX`, and `DB_SCHEMA` via env, and tests need to exercise
 * different prefixes within one process. Resolving lazily on each table
 * creation keeps the factory honest to the current environment.
 */
const resolvePrefix = (): string => process.env.DB_TABLE_PREFIX ?? '';

/** Applies the configurable table-name prefix to a base table name. */
const withPrefix = (name: string): string => `${resolvePrefix()}${name}`;

/**
 * Creates a PostgreSQL table with the configured prefix applied.
 *
 * WHY centralized: operators may share a database with other apps, so every
 * table must be prefixable (e.g. `lg_`). Routing all table definitions through
 * this single factory guarantees no entity bypasses the convention.
 */
export const pgTable = pgTableCreator((name) => withPrefix(name));

/**
 * Creates a SQLite table with the configured prefix applied. SQLite has no
 * schemas, so the schema setting is ignored gracefully for this driver.
 */
export const sqliteTable = sqliteTableCreator((name) => withPrefix(name));

/** True when the configured driver is PostgreSQL. */
export const isPostgres = (): boolean => (process.env.DB_DRIVER ?? 'sqlite') === 'postgres';

/** The configured PostgreSQL schema (defaults to `public`; ignored on SQLite). */
export const targetSchema = (): string => process.env.DB_SCHEMA ?? 'public';
