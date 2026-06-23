import type { AnySQLiteColumn } from 'drizzle-orm/sqlite-core';
import type { AuditExtras, AuditOwnershipColumns } from './sqlite/audit.js';
import type { DbConnection, Schema } from '../types.js';

/**
 * Relational databases the gateway supports.
 *
 * WHY a single union: this is the one place that enumerates "which databases work". Adding a dialect
 * (e.g. `'mysql'`) starts here, then a `providers/<name>/` folder implements the {@link ProviderModule}
 * and one `dialectRegistry` line registers it. NOTE: Drizzle ships dialect cores for PostgreSQL,
 * MySQL/MariaDB, and SQLite only — there is no SQL Server core, so SQL Server cannot be added.
 */
export type SupportedProvider = 'sqlite' | 'postgres';

/**
 * Semantic column primitives every dialect provides. Return types are the **canonical** (SQLite)
 * builders so entities authored ONCE in `schema/` keep precise types; non-canonical dialects return
 * their real builders cast to this shape (PAT-009).
 */
export type ColumnKit = typeof import('./sqlite/column-kit.js').sqliteColumnKit;

/** Canonical (SQLite-typed) prefix-applying table creator; non-canonical dialects cast to this. */
export type TableCreator = typeof import('./sqlite/table.js').sqliteTable;

/** Canonical (SQLite-typed) table-level index builder; non-canonical dialects cast to this. */
export type IndexFn = typeof import('drizzle-orm/sqlite-core').index;

/** drizzle-kit configuration lives in the package-root `drizzle.config.ts` (see WHY there). */

/**
 * One self-contained database implementation (Abstract Factory — PAT-009). A provider folder bundles
 * everything driver-specific behind this contract so common code (schema, connection, migrate)
 * never branches on the driver inline (GUD-011).
 */
export interface ProviderModule {
  /** The provider this module implements. */
  readonly id: SupportedProvider;
  /** Prefix-applying table creator. */
  readonly table: TableCreator;
  /** Semantic column primitives used to author entities once. */
  readonly columnKit: ColumnKit;
  /** Table-level index builder. */
  readonly index: IndexFn;
  /** Builds the real `createdBy`/`modifiedBy` FK (`ON DELETE SET NULL`) + indexes for an entity. */
  auditExtras(tableName: string, audit: AuditOwnershipColumns, usersId: AnySQLiteColumn): AuditExtras;
  /** Opens a connection (Drizzle client + `disconnect`); `schema` is passed in to avoid the barrel. */
  connect(schema: Schema): DbConnection;
  /** Applies pending migrations for this provider. */
  runMigrator(migrationsFolder?: string): Promise<void>;
}
