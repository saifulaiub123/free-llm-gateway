import { index as pgIndex } from 'drizzle-orm/pg-core';
import type { ProviderModule, IndexFn } from '../provider.contract.js';
import { pgTable } from './table.js';
import { postgresColumnKit } from './column-kit.js';
import { pgAuditTableExtras } from './audit.js';
import { connectPostgres } from './connection.js';
import { runPostgresMigrator } from './migrate.js';

/**
 * The PostgreSQL provider module. It mirrors the SQLite reference over `pg-core`; provider-specific
 * builders are cast to the canonical contract types at their export boundary. Compile/typecheck
 * validated — live PostgreSQL integration testing is deferred to a later task (TASK-071 note).
 */
export const postgresProvider: ProviderModule = {
  id: 'postgres',
  table: pgTable,
  columnKit: postgresColumnKit,
  index: pgIndex as unknown as IndexFn,
  auditExtras: pgAuditTableExtras,
  connect: connectPostgres,
  runMigrator: runPostgresMigrator,
};
