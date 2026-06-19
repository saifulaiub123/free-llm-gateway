/**
 * Public barrel for the `@gateway/db` package.
 *
 * The dialect registry (PAT-009) is the single source of truth: one self-contained module per
 * database under `src/dialects/<name>/`, resolved via `getActiveDialect()`. The connection and
 * migration entrypoints, schema column factories, and audit helper all dispatch through it.
 */
export {
  getActiveDialect,
  resolveDialect,
  isPostgres,
  dialectRegistry,
  DEFAULT_DIALECT,
} from './dialects/registry.js';

export type {
  SupportedDialect,
  DialectModule,
  ColumnKit,
} from './dialects/dialect.contract.js';

export { createDb } from './connection.js';
export type { Db, Schema, DbExecutor } from './types.js';

export { runMigrations } from './migrate.js';

export {
  baseColumns,
  baseEntityColumns,
  makeBaseColumns,
  makeBaseEntityColumns,
} from './schema/columns.js';

export { auditTableExtras } from './schema/audit.js';
export type { AuditExtras, AuditOwnershipColumns } from './schema/audit.js';
