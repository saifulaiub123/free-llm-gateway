/**
 * Public barrel for the `@gateway/db` package.
 *
 * The table factory (TASK-004) is the single source of truth for table naming
 * (prefix + schema) and the dialect registry. The connection factory (TASK-005)
 * builds the driver-agnostic Drizzle client. Schema and migrations are added in
 * later phases.
 */
export {
  pgTable,
  sqliteTable,
  tableCreators,
  resolveDialect,
  isPostgres,
  targetSchema,
  DEFAULT_DIALECT,
  type SupportedDialect,
} from './table-factory.js';

export { createDb, type Db, type Schema } from './connection.js';

export { runMigrations } from './migrate.js';
