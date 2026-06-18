/**
 * Public barrel for the `@gateway/db` package.
 *
 * The table factory (TASK-004) is the single source of truth for table naming
 * (prefix + schema). The connection factory (TASK-005), schema, and migrations
 * are added in later Phase 0 tasks.
 */
export { pgTable, sqliteTable, isPostgres, targetSchema } from './table-factory.js';
