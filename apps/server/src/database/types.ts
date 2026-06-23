import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import type * as schema from './schema/index.js';

/** The full set of Drizzle schema entities (grows as later phases add tables). */
export type Schema = typeof schema;

/**
 * The driver-agnostic Drizzle client the whole app programs against.
 *
 * WHY libSQL's async client is the canonical type: both supported drivers — libSQL (SQLite) and
 * node-postgres — expose the SAME asynchronous query-builder surface (`await db.select()...`,
 * `.returning()`), so a single repository body runs on both. The PostgreSQL client is structurally
 * compatible and is cast to this canonical type at its construction boundary (PAT-009); the cast is
 * runtime-sound because the awaited builder API is shared (no more sync/async split). Kept type-only
 * so it can be referenced from the dialect contract without creating an import cycle.
 */
export type Db = LibSQLDatabase<Schema>;

/**
 * An open database connection: the Drizzle client plus a `disconnect` that closes the underlying
 * driver handle (libSQL client / pg pool). A provider's `connect` returns this so {@link Db} consumers
 * stay driver-agnostic while the app can still shut the connection down gracefully.
 */
export interface DbConnection {
  /** The driver-agnostic Drizzle client. */
  readonly db: Db;
  /** Closes the underlying driver connection. */
  disconnect(): Promise<void>;
}
