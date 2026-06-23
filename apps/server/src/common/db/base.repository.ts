import {
  and,
  eq,
  sql,
  type InferInsertModel,
  type InferSelectModel,
  type SQL,
} from 'drizzle-orm';
import type { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core';
import type { Db, DatabaseService } from '../../database/index.js';

/**
 * Generic data-mapper repository over a Drizzle table.
 *
 * WHY a base class: it centralizes the conventions every entity needs exactly once — soft-delete
 * filtering (`is_deleted = false`), `user_id` scoping (SEC-004), and optional-`tx` support — so
 * concrete repositories add ONLY entity-specific queries. The optional `tx` parameter is the Drizzle
 * stand-in for EF's `DbContext`-as-Unit-of-Work (Drizzle has no change tracking): a service wraps
 * several writes in `db.transaction(tx => ...)` and passes `tx` to each call for atomicity.
 *
 * Methods are async (Promise-returning) and run against the canonical async client ({@link Db}); the
 * same body executes on libSQL (SQLite) and node-postgres alike — see the `Db` WHY in `../../database`.
 */
export abstract class BaseRepository<TTable extends SQLiteTable> {
  /**
   * @param database The injected {@link DatabaseService}; queries read its `db` lazily at call time.
   * @param table The Drizzle table this repository manages.
   * @param softDeletable Whether the table carries the audit/soft-delete columns (composed
   *   `baseEntityColumns`). When false, `softDelete` is rejected and no `is_deleted` filter applies.
   */
  protected constructor(
    protected readonly database: DatabaseService,
    protected readonly table: TTable,
    protected readonly softDeletable: boolean,
  ) {}

  /** Resolves the active client, or a passed transaction, to run a query against. */
  protected exec(tx?: Db): Db {
    return tx ?? this.database.db;
  }

  /** Looks a column up by its JS property name (e.g. `id`, `isDeleted`, `userId`). */
  private column(name: string): SQLiteColumn {
    return (this.table as unknown as Record<string, SQLiteColumn>)[name] as SQLiteColumn;
  }

  /** `is_deleted = false` when the table is soft-deletable, else no predicate. */
  private notDeleted(): SQL | undefined {
    return this.softDeletable ? eq(this.column('isDeleted'), false) : undefined;
  }

  /** Combines the primary-key predicate with the soft-delete filter. */
  private byId(id: number): SQL {
    return and(eq(this.column('id'), id), this.notDeleted()) as SQL;
  }

  /** Adds a `user_id = :userId` predicate so callers cannot read another user's rows (SEC-004). */
  protected scopedToUser(userId: number): SQL {
    return eq(this.column('userId'), userId);
  }

  /** Finds a single row by primary key (excludes soft-deleted rows). */
  async findById(id: number, tx?: Db): Promise<InferSelectModel<TTable> | undefined> {
    const rows = await this.exec(tx).select().from(this.table).where(this.byId(id)).limit(1);
    return rows[0] as InferSelectModel<TTable> | undefined;
  }

  /** Finds all rows matching an optional predicate (excludes soft-deleted rows). */
  async findAll(where?: SQL, tx?: Db): Promise<InferSelectModel<TTable>[]> {
    const rows = await this.exec(tx)
      .select()
      .from(this.table)
      .where(and(where, this.notDeleted()));
    return rows as InferSelectModel<TTable>[];
  }

  /** Inserts a row and returns it. */
  async create(values: InferInsertModel<TTable>, tx?: Db): Promise<InferSelectModel<TTable>> {
    const rows = (await this.exec(tx)
      .insert(this.table)
      .values(values as never) // generic insert-source over an abstract TTable
      .returning()) as InferSelectModel<TTable>[];
    const row = rows[0];
    if (!row) {
      throw new Error('create() did not return the inserted row');
    }
    return row;
  }

  /** Updates a row by id (stamps `modifiedAt` on audited tables) and returns the new row. */
  async update(
    id: number,
    patch: Partial<InferInsertModel<TTable>>,
    tx?: Db,
  ): Promise<InferSelectModel<TTable> | undefined> {
    // Audited tables track when a row last changed; baseColumns-only tables have no such column.
    const values = this.softDeletable ? { ...patch, modifiedAt: new Date() } : patch;
    const rows = (await this.exec(tx)
      .update(this.table)
      .set(values as never) // generic set-source over an abstract TTable
      .where(this.byId(id))
      .returning()) as InferSelectModel<TTable>[];
    return rows[0];
  }

  /** Soft-deletes a row (`is_deleted = true`). Throws if the table is not soft-deletable. */
  async softDelete(id: number, tx?: Db): Promise<void> {
    if (!this.softDeletable) {
      throw new Error('softDelete() requires a table composing baseEntityColumns');
    }
    await this.exec(tx)
      .update(this.table)
      .set({ isDeleted: true, modifiedAt: new Date() } as never)
      .where(eq(this.column('id'), id));
  }

  /** Physically deletes a row (no soft-delete filter). */
  async hardDelete(id: number, tx?: Db): Promise<void> {
    await this.exec(tx).delete(this.table).where(eq(this.column('id'), id));
  }

  /** True when a row with the id exists (excludes soft-deleted rows). */
  async exists(id: number, tx?: Db): Promise<boolean> {
    return (await this.findById(id, tx)) !== undefined;
  }

  /** Counts rows matching an optional predicate (excludes soft-deleted rows). */
  async count(where?: SQL, tx?: Db): Promise<number> {
    const rows = await this.exec(tx)
      .select({ value: sql<number>`count(*)` })
      .from(this.table)
      .where(and(where, this.notDeleted()));
    return rows[0]?.value ?? 0;
  }
}
