import { index } from 'drizzle-orm/sqlite-core';
import type { DialectModule } from '../dialect.contract.js';
import { sqliteTable } from './table.js';
import { sqliteColumnKit } from './column-kit.js';
import { auditTableExtras } from './audit.js';
import { createSqliteDrizzle } from './connection.js';
import { runSqliteMigrator } from './migrate.js';

/**
 * The SQLite dialect module — the reference implementation of {@link DialectModule} (PAT-009).
 * Its `columnKit` defines the canonical typing surface every other dialect conforms to.
 */
export const sqliteDialect: DialectModule = {
  id: 'sqlite',
  table: sqliteTable,
  columnKit: sqliteColumnKit,
  index,
  auditExtras: auditTableExtras,
  createDrizzle: createSqliteDrizzle,
  runMigrator: runSqliteMigrator,
};
