import { describe, expect, it } from 'vitest';
import { getTableConfig, integer, sqliteTable as rawSqliteTable, text } from 'drizzle-orm/sqlite-core';
import { baseEntityColumns } from '../../schema/columns.js';
import { auditTableExtras } from './audit.js';

// A stand-in users table (just needs an `id` to reference) and a child entity that wires the
// audit FK + indexes. Uses the raw creator so the test is independent of DB_TABLE_PREFIX.
const fakeUsers = rawSqliteTable('fake_users', { id: integer('id').primaryKey() });
const child = rawSqliteTable(
  'child',
  { ...baseEntityColumns, name: text('name').notNull() },
  (table) => auditTableExtras('child', table, fakeUsers.id),
);

/**
 * Verifies the SQLite audit helper emits real foreign keys (to `users.id`) and indexes for the
 * `createdBy`/`modifiedBy` columns, so migrations enforce referential integrity (GUD-010).
 */
describe('auditTableExtras (sqlite)', () => {
  it('declares foreign keys for createdBy and modifiedBy', () => {
    const config = getTableConfig(child);
    expect(config.foreignKeys).toHaveLength(2);
  });

  it('references the users.id column with ON DELETE SET NULL', () => {
    const config = getTableConfig(child);
    const reference = config.foreignKeys[0]?.reference();
    expect(reference?.foreignTable).toBe(fakeUsers);
    expect(config.foreignKeys[0]?.onDelete).toBe('set null');
  });

  it('declares an index on each audit FK column', () => {
    const config = getTableConfig(child);
    expect(config.indexes.length).toBeGreaterThanOrEqual(2);
  });
});
