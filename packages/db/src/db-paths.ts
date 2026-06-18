/**
 * Single source of truth for database connection paths.
 *
 * WHY centralized: the default SQLite location and the `file:` URL handling were previously
 * duplicated across the connection factory, the migration runner, and `drizzle.config.ts`. Keeping
 * them here means the default DB path is defined exactly once, so changing it can never drift
 * between runtime and migration tooling.
 */

/** Default SQLite database location for zero-config development. */
export const DEFAULT_SQLITE_URL = 'file:./data/llm-gateway.db';

/** Resolves the configured database connection URL, defaulting to local SQLite. */
export const resolveDatabaseUrl = (): string => process.env.DB_URL ?? DEFAULT_SQLITE_URL;

/**
 * Resolves the on-disk SQLite file path from the configured URL.
 *
 * Strips a leading `file:` so both `file:./data/llm-gateway.db` and a bare path work, and passes
 * `:memory:` through unchanged for in-memory databases.
 */
export const resolveSqliteFilePath = (): string => resolveDatabaseUrl().replace(/^file:/, '');
