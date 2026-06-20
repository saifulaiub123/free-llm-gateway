import { sql } from 'drizzle-orm';
import { integer, real, text } from 'drizzle-orm/sqlite-core';

/**
 * Semantic column primitives for SQLite — the **canonical** `ColumnKit`. Its type defines the kit
 * surface that every dialect implements, so entities authored once in `schema/` against these
 * primitives keep precise types and work for every dialect (PAT-009).
 *
 * WHY semantic names (`pk`/`createdAt`/`timestamp`/`boolean`) instead of raw Drizzle builders: the
 * SQLite and PostgreSQL column builders are different and incompatible (`integer(name, {mode:
 * 'timestamp'})` vs `timestamp(name)`), so the kit hides those differences behind dialect-neutral
 * intent. A non-canonical dialect (e.g. PostgreSQL) returns its real builders cast to this shape.
 */
export const sqliteColumnKit = {
  /** Auto-incrementing surrogate primary key. */
  pk: (name = 'id') => integer(name).primaryKey({ autoIncrement: true }),

  /** Creation timestamp — NOT NULL, defaulting to the current unix epoch. */
  createdAt: (name = 'created_at') =>
    integer(name, { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),

  /** Nullable timestamp column. */
  timestamp: (name: string) => integer(name, { mode: 'timestamp' }),

  /** Boolean column (stored as an integer in SQLite). */
  boolean: (name: string) => integer(name, { mode: 'boolean' }),

  /** Integer column (also used for foreign-key columns). */
  integer: (name: string) => integer(name),

  /** Floating-point (REAL) column for fractional metrics like costs, scores, and stability. */
  real: (name: string) => real(name),

  /** Text column, optionally constrained to a string enum. */
  text: <T extends string>(name: string, config?: { enum: readonly [T, ...T[]] }) =>
    config ? text(name, config) : text(name),
};
