import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from './schema/index.js';

/** The full set of Drizzle schema entities (grows as later phases add tables). */
export type Schema = typeof schema;

/**
 * Driver-agnostic database handle the rest of the app depends on.
 *
 * WHY a union (not a single type): the PostgreSQL and SQLite Drizzle clients are distinct types, but
 * every consumer programs against this abstract `Db` so a dialect switch is a config change, never a
 * code change. Kept type-only (no runtime imports) so it can be referenced from the dialect contract
 * without creating an import cycle.
 */
export type Db = NodePgDatabase<Schema> | BetterSQLite3Database<Schema>;

/**
 * The query-execution surface a repository programs against.
 *
 * WHY the canonical (SQLite) client type and not the {@link Db} union: the driver clients have
 * divergent query APIs (better-sqlite3 is synchronous — `.all()/.get()/.run()`; node-postgres is
 * awaitable), so the repository layer targets the tested SQLite surface (the canonical dialect —
 * PAT-009) and narrows the active client to it. Live PostgreSQL execution is part of the follow-up to
 * TASK-071 (PostgreSQL is compile-only today).
 */
export type DbExecutor = BetterSQLite3Database<Schema>;
