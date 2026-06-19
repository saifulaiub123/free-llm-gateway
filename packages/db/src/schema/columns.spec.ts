import { describe, expect, it } from 'vitest';
import { getTableColumns, getTableName, sql } from 'drizzle-orm';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { text } from 'drizzle-orm/sqlite-core';
import { sqliteTable } from '../dialects/sqlite/table.js';
import { baseColumns, baseEntityColumns } from './columns.js';

// Two tables share the base sets — this also proves the spread yields independent columns per table.
const minimalWidgets = sqliteTable('minimal_widgets', {
  ...baseColumns,
  name: text('name').notNull(),
});
const entityWidgets = sqliteTable('entity_widgets', {
  ...baseEntityColumns,
  name: text('name').notNull(),
});

/** Creates an in-memory libSQL db with the `entity_widgets` table for round-trip checks. */
async function createEntityDb(): Promise<{ db: ReturnType<typeof drizzle>; close: () => void }> {
  const client = createClient({ url: ':memory:' });
  await client.execute(`CREATE TABLE ${getTableName(entityWidgets)} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    created_by INTEGER,
    modified_by INTEGER,
    modified_at INTEGER,
    is_active INTEGER NOT NULL DEFAULT 1,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    name TEXT NOT NULL
  )`);
  return { db: drizzle(client), close: () => client.close() };
}

/**
 * Verifies the shared base-column sets (built from the active dialect's ColumnKit) expose the right
 * columns and round-trip with their defaults, since every entity composes these instead of
 * re-declaring `id`/`createdAt` (GUD-009 / PAT-009).
 */
describe('base column sets', () => {
  it('baseColumns exposes id + createdAt', () => {
    expect(Object.keys(getTableColumns(minimalWidgets)).sort()).toEqual(
      ['createdAt', 'id', 'name'].sort(),
    );
  });

  it('baseEntityColumns adds createdBy, modifiedBy, modifiedAt, isActive, isDeleted', () => {
    expect(Object.keys(getTableColumns(entityWidgets)).sort()).toEqual(
      [
        'createdAt',
        'createdBy',
        'id',
        'isActive',
        'isDeleted',
        'modifiedAt',
        'modifiedBy',
        'name',
      ].sort(),
    );
  });

  it('produces independent tables when the same set is spread into several', () => {
    expect(getTableName(minimalWidgets)).not.toBe(getTableName(entityWidgets));
    expect(getTableColumns(minimalWidgets).id).toBeDefined();
    expect(getTableColumns(entityWidgets).id).toBeDefined();
  });

  it('round-trips with defaults applied (createdAt set, isActive true, isDeleted false)', async () => {
    const { db, close } = await createEntityDb();
    await db.insert(entityWidgets).values({ name: 'alpha' });
    const rows = await db.select().from(entityWidgets);
    close();

    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe('alpha');
    expect(rows[0]?.isActive).toBe(true);
    expect(rows[0]?.isDeleted).toBe(false);
    expect(rows[0]?.createdAt).toBeInstanceOf(Date);
    expect(rows[0]?.modifiedAt).toBeNull();
  });

  it('soft-deletes via the isDeleted column', async () => {
    const { db, close } = await createEntityDb();
    await db.insert(entityWidgets).values({ name: 'beta', isDeleted: true });
    const active = await db
      .select()
      .from(entityWidgets)
      .where(sql`is_deleted = 0`);
    close();

    expect(active).toHaveLength(0);
  });
});
