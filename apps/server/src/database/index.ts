/**
 * Public barrel for the database module.
 *
 * The provider registry (PAT-009) is the single source of truth: one self-contained module per
 * database under `src/database/providers/<name>/`, resolved via `getActiveProvider()`. The connection
 * and migration entrypoints, schema column factories, and audit helper all dispatch through it.
 */
export {
  getActiveProvider,
  resolveProvider,
  isPostgres,
  providerRegistry,
  DEFAULT_PROVIDER,
} from './providers/registry.js';

export type {
  SupportedProvider,
  ProviderModule,
  ColumnKit,
} from './providers/provider.contract.js';

export { createDb } from './connection.js';
export type { Db, Schema } from './types.js';

export { runMigrations } from './migrate.js';

export {
  baseColumns,
  baseEntityColumns,
  makeBaseColumns,
  makeBaseEntityColumns,
} from './schema/columns.js';

export { auditTableExtras } from './schema/audit.js';
export type { AuditExtras, AuditOwnershipColumns } from './schema/audit.js';

// Schema entities (authored once via the active provider's ColumnKit). Grows per phase.
export * from './schema/index.js';
