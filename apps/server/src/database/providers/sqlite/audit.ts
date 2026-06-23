import { foreignKey, index, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core';

/** The audit ownership columns from `baseEntityColumns` that reference `users`. */
export interface AuditOwnershipColumns {
  createdBy: AnySQLiteColumn;
  modifiedBy: AnySQLiteColumn;
}

/**
 * Builds the table-level FK constraints + indexes for the `createdBy`/`modifiedBy` audit columns
 * of an entity that composes `baseEntityColumns`. Call it from the table's second-argument builder,
 * passing the entity's own audit columns and the `users.id` column.
 *
 * WHY here and not in `schema/columns.ts`: the foreign key references the `users` table, which itself
 * composes the base columns — declaring the constraint per-table keeps the shared column factories
 * free of a circular import while still emitting real `FOREIGN KEY ... ON DELETE SET NULL` + `INDEX`
 * DDL in migrations (GUD-010). `ON DELETE SET NULL` preserves audit rows when a user is removed, and
 * the indexes back the FK lookups (FK columns are not auto-indexed in SQLite/PostgreSQL).
 *
 * @param tableName Base (unprefixed) table name, used to make index/constraint names unique.
 * @param audit The entity's own `createdBy`/`modifiedBy` columns.
 * @param usersId The `users.id` column the audit columns reference.
 */
export function auditTableExtras(
  tableName: string,
  audit: AuditOwnershipColumns,
  usersId: AnySQLiteColumn,
) {
  return {
    createdByFk: foreignKey({
      columns: [audit.createdBy],
      foreignColumns: [usersId],
      name: `${tableName}_created_by_fk`,
    }).onDelete('set null'),
    modifiedByFk: foreignKey({
      columns: [audit.modifiedBy],
      foreignColumns: [usersId],
      name: `${tableName}_modified_by_fk`,
    }).onDelete('set null'),
    createdByIdx: index(`${tableName}_created_by_idx`).on(audit.createdBy),
    modifiedByIdx: index(`${tableName}_modified_by_idx`).on(audit.modifiedBy),
  };
}

/** The FK + index extras object returned by {@link auditTableExtras}. */
export type AuditExtras = ReturnType<typeof auditTableExtras>;
