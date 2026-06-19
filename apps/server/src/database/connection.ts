import * as schema from './schema/index.js';
import { getActiveProvider } from './providers/registry.js';
import type { Db, DbConnection } from './types.js';

export type { Db, Schema, DbConnection } from './types.js';

/**
 * Opens a database connection (client + `disconnect`) for the configured provider.
 *
 * WHY a thin dispatcher: the rest of the app depends on the abstract `Db`/`DbConnection` types, never
 * on a concrete driver, so switching providers is a `DB_PROVIDER` config change with zero code
 * changes. The active provider module owns the driver wiring; the schema barrel is passed in so
 * provider modules never import it (avoiding an import cycle).
 */
export function connectDb(): DbConnection {
  return getActiveProvider().connect(schema);
}

/** Convenience accessor returning only the Drizzle client (no lifecycle); used by tests and tools. */
export function createDb(): Db {
  return connectDb().db;
}
