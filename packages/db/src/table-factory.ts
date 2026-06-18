import { pgTableCreator } from 'drizzle-orm/pg-core';
import { sqliteTableCreator } from 'drizzle-orm/sqlite-core';

/**
 * The relational database dialects the gateway supports.
 *
 * WHY a single union: this is the one place that enumerates "which databases work". Adding a
 * dialect (e.g. `'mysql'`) starts here, then the connection factory (TASK-005) and migration
 * config (TASK-006) branch on the same type. The `satisfies` check on {@link tableCreators}
 * turns a missing registration into a compile error (Open/Closed — GUD-008).
 */
export type SupportedDialect = 'postgres' | 'sqlite';

/** Default dialect when `DB_DRIVER` is unset — zero-config development uses SQLite. */
export const DEFAULT_DIALECT: SupportedDialect = 'sqlite';

/**
 * Reads the configured table-name prefix from the environment.
 *
 * WHY a getter (not a module-level constant): operators set `DB_TABLE_PREFIX` via env, and tests
 * need to exercise different prefixes within one process. Resolving lazily on each table creation
 * keeps the factory honest to the current environment.
 */
const resolvePrefix = (): string => process.env.DB_TABLE_PREFIX ?? '';

/** Applies the configurable table-name prefix to a base table name. */
const withPrefix = (name: string): string => `${resolvePrefix()}${name}`;

/**
 * Per-dialect Drizzle table creators, each preserving its dialect's column types.
 *
 * WHY a registry instead of a single dispatching `createTable`: Drizzle's column builders are
 * dialect-specific and mutually incompatible (`pg-core` `integer` ≠ `sqlite-core` `integer`), so a
 * single dispatcher would collapse column types to a union and lose type safety in every schema
 * file. Keeping one typed creator per dialect preserves that safety, while
 * `satisfies Record<SupportedDialect, unknown>` forces every dialect in the union to be registered
 * here — adding a dialect without a creator fails to compile.
 */
export const tableCreators = {
  postgres: pgTableCreator((name) => withPrefix(name)),
  sqlite: sqliteTableCreator((name) => withPrefix(name)),
} satisfies Record<SupportedDialect, unknown>;

/** PostgreSQL table creator (prefix applied; tables land in `DB_SCHEMA` at migration time). */
export const pgTable = tableCreators.postgres;

/** SQLite table creator (prefix applied; schema configuration is ignored gracefully). */
export const sqliteTable = tableCreators.sqlite;

/** Resolves the active dialect from `DB_DRIVER`, falling back to {@link DEFAULT_DIALECT}. */
export const resolveDialect = (): SupportedDialect =>
  (process.env.DB_DRIVER as SupportedDialect | undefined) ?? DEFAULT_DIALECT;

/** True when the configured dialect is PostgreSQL. */
export const isPostgres = (): boolean => resolveDialect() === 'postgres';

/** The configured PostgreSQL schema (defaults to `public`; ignored on SQLite). */
export const targetSchema = (): string => process.env.DB_SCHEMA ?? 'public';
