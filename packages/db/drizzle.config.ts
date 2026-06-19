import type { Config } from 'drizzle-kit';

/**
 * Drizzle Kit configuration.
 *
 * WHY self-contained (the one place that branches on the driver inline): drizzle-kit loads this file
 * with a CJS/require transform that cannot resolve NodeNext `.js` import specifiers back to their
 * `.ts` sources, so it cannot import the dialect registry/modules (which use `.js` extensions). The
 * runtime dialect modules remain the single source for everything else; this file only mirrors the
 * two trivial drizzle-kit values (output folder + dialect string) per `DB_DRIVER`, kept in sync with
 * each dialect's `migrate.ts` migrations folder.
 */
const isPostgres = (process.env.DB_DRIVER ?? 'sqlite') === 'postgres';
const url = process.env.DB_URL ?? (isPostgres ? '' : 'file:./data/llm-gateway.db');

export default {
  schema: './src/schema/index.ts',
  out: isPostgres ? './migrations/postgres' : './migrations/sqlite',
  dialect: isPostgres ? 'postgresql' : 'sqlite',
  dbCredentials: { url },
} satisfies Config;
