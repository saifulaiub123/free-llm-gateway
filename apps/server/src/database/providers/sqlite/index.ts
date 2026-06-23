import { index } from 'drizzle-orm/sqlite-core';
import type { ProviderModule } from '../provider.contract.js';
import { sqliteTable } from './table.js';
import { sqliteColumnKit } from './column-kit.js';
import { auditTableExtras } from './audit.js';
import { connectSqlite } from './connection.js';
import { runSqliteMigrator } from './migrate.js';

/**
 * The SQLite provider module — the reference implementation of {@link ProviderModule} (PAT-009).
 * Its `columnKit` defines the canonical typing surface every other provider conforms to.
 */
export const sqliteProvider: ProviderModule = {
  id: 'sqlite',
  table: sqliteTable,
  columnKit: sqliteColumnKit,
  index,
  auditExtras: auditTableExtras,
  connect: connectSqlite,
  runMigrator: runSqliteMigrator,
};
