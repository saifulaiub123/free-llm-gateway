import * as schema from './schema/index.js';
import { getActiveProvider } from './providers/registry.js';
import type { Db } from './types.js';

export type { Db, Schema } from './types.js';

/**
 * Creates a Drizzle client for the configured provider.
 *
 * WHY a thin dispatcher: the rest of the app depends on the abstract {@link Db} type, never on a
 * concrete driver, so switching providers is a `DB_PROVIDER` config change with zero code changes. The
 * active provider module owns the driver wiring; the schema barrel is passed in so provider modules
 * never import it (avoiding an import cycle).
 */
export function createDb(): Db {
  return getActiveProvider().createDrizzle(schema);
}
