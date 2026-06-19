import { foreignKey, index, type AnyPgColumn } from 'drizzle-orm/pg-core';
import type { AnySQLiteColumn } from 'drizzle-orm/sqlite-core';
import type { AuditExtras, AuditOwnershipColumns } from '../sqlite/audit.js';

/**
 * PostgreSQL equivalent of the audit FK/index helper. Params/return use the canonical (SQLite-typed)
 * shapes from the contract; the columns are real `pg-core` columns at runtime, so they are cast to
 * {@link AnyPgColumn} before being handed to `pg-core`'s `foreignKey`/`index`. The emitted DDL is the
 * genuine PostgreSQL `FOREIGN KEY ... ON DELETE SET NULL` + `INDEX` (GUD-010).
 */
export function pgAuditTableExtras(
  tableName: string,
  audit: AuditOwnershipColumns,
  usersId: AnySQLiteColumn,
): AuditExtras {
  const createdBy = audit.createdBy as unknown as AnyPgColumn;
  const modifiedBy = audit.modifiedBy as unknown as AnyPgColumn;
  const ref = usersId as unknown as AnyPgColumn;
  return {
    createdByFk: foreignKey({
      columns: [createdBy],
      foreignColumns: [ref],
      name: `${tableName}_created_by_fk`,
    }).onDelete('set null'),
    modifiedByFk: foreignKey({
      columns: [modifiedBy],
      foreignColumns: [ref],
      name: `${tableName}_modified_by_fk`,
    }).onDelete('set null'),
    createdByIdx: index(`${tableName}_created_by_idx`).on(createdBy),
    modifiedByIdx: index(`${tableName}_modified_by_idx`).on(modifiedBy),
  } as unknown as AuditExtras;
}
