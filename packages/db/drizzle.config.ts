import type { Config } from 'drizzle-kit';

/**
 * Drizzle Kit configuration.
 *
 * WHY self-contained (the one place that branches on the driver inline): this file only needs two
 * trivial values per `DB_DRIVER` (output folder + dialect string), so it avoids importing the full
 * dialect registry (which would pull in the native pg / better-sqlite3 drivers) just for config. The
 * `schema` it points at DOES import the registry via NodeNext `.js` specifiers; drizzle-kit's own
 * loader cannot resolve those, so `db:generate` runs drizzle-kit under `tsx` (see package.json).
 * Keep `out` in sync with each dialect's `migrate.ts` migrations folder.
 */
const isPostgres = (process.env.DB_DRIVER ?? 'sqlite') === 'postgres';
const url = process.env.DB_URL ?? (isPostgres ? '' : 'file:./data/llm-gateway.db');

export default {
  schema: './src/schema/index.ts',
  out: isPostgres ? './migrations/postgres' : './migrations/sqlite',
  dialect: isPostgres ? 'postgresql' : 'sqlite',
  dbCredentials: { url },
} satisfies Config;
