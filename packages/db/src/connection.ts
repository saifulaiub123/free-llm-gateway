import * as schema from './schema/index.js';
import { getActiveDialect } from './dialects/registry.js';
import type { Db } from './types.js';

export type { Db, Schema } from './types.js';

/**
 * Creates a Drizzle client for the configured dialect.
 *
 * WHY a thin dispatcher: the rest of the app depends on the abstract {@link Db} type, never on a
 * concrete driver, so switching dialects is a `DB_DRIVER` config change with zero code changes. The
 * active dialect module owns the driver wiring; the schema barrel is passed in so dialect modules
 * never import it (avoiding an import cycle).
 */
export function createDb(): Db {
  return getActiveDialect().createDrizzle(schema);
}
