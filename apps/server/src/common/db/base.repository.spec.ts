import { beforeEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { baseEntityColumns, createDb, type Db } from '../../database/index.js';
import { BaseRepository } from './base.repository.js';

// Throwaway entity for exercising the generic repository (composes the shared audit columns).
const testWidgets = sqliteTable('test_widgets', {
  ...baseEntityColumns,
  userId: integer('user_id').notNull(),
  name: text('name').notNull(),
});

/** Minimal soft-deletable repository over the test table, exposing `scopedToUser` for the test. */
class TestWidgetRepository extends BaseRepository<typeof testWidgets> {
  constructor(db: Db) {
    super(db, testWidgets, true);
  }

  /** Public passthrough so the protected SEC-004 helper can be asserted directly. */
  forUser(userId: number): Promise<(typeof testWidgets.$inferSelect)[]> {
    return this.findAll(this.scopedToUser(userId));
  }
}

const CREATE_TABLE = sql`CREATE TABLE test_widgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  created_by INTEGER,
  modified_by INTEGER,
  modified_at INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL
)`;

/** A fresh in-memory SQLite db + the test table. `setup-env.ts` pins DB_DRIVER=sqlite, DB_URL=:memory:. */
async function freshDb(): Promise<Db> {
  const db = createDb();
  await db.run(CREATE_TABLE);
  return db;
}

/**
 * Verifies the generic repository's CRUD, soft-delete filtering, and `user_id` scoping, since every
 * concrete repository inherits this behavior (PAT-008 / SEC-004).
 */
describe('BaseRepository', () => {
  let repo: TestWidgetRepository;

  beforeEach(async () => {
    repo = new TestWidgetRepository(await freshDb());
  });

  it('round-trips a row through create + findById', async () => {
    const created = await repo.create({ userId: 1, name: 'alpha' });
    expect(created.id).toBeGreaterThan(0);

    const found = await repo.findById(created.id);
    expect(found?.name).toBe('alpha');
    expect(found?.isDeleted).toBe(false);
  });

  it('hides soft-deleted rows from reads but keeps them physically', async () => {
    const { id } = await repo.create({ userId: 1, name: 'beta' });
    await repo.softDelete(id);

    expect(await repo.findById(id)).toBeUndefined();
    expect(await repo.findAll()).toHaveLength(0);
    expect(await repo.count()).toBe(0);
    expect(await repo.exists(id)).toBe(false);
  });

  it('hardDelete physically removes the row', async () => {
    const { id } = await repo.create({ userId: 1, name: 'gamma' });
    await repo.hardDelete(id);

    expect(await repo.findById(id)).toBeUndefined();
    expect(await repo.count()).toBe(0);
  });

  it('update applies the patch and stamps modifiedAt', async () => {
    const { id } = await repo.create({ userId: 1, name: 'delta' });
    const updated = await repo.update(id, { name: 'delta-2' });

    expect(updated?.name).toBe('delta-2');
    expect(updated?.modifiedAt).toBeInstanceOf(Date);
  });

  it('scopedToUser blocks cross-user reads (SEC-004)', async () => {
    await repo.create({ userId: 1, name: 'mine' });
    await repo.create({ userId: 2, name: 'theirs' });

    const mine = await repo.forUser(1);
    expect(mine).toHaveLength(1);
    expect(mine[0]?.name).toBe('mine');
  });

  it('rejects softDelete on a table without baseEntityColumns', async () => {
    class HardRepo extends BaseRepository<typeof testWidgets> {
      constructor(db: Db) {
        super(db, testWidgets, false);
      }
    }
    const hard = new HardRepo(await freshDb());
    const { id } = await hard.create({ userId: 1, name: 'x' });

    await expect(hard.softDelete(id)).rejects.toThrow();
  });
});
