/**
 * Lazy accessors for the database environment variables.
 *
 * WHY getters (not module-level constants): operators set these via env and tests vary them per
 * case, so every read must reflect the current `process.env` at call time. Centralizing them here
 * keeps the dialect modules and common code free of scattered `process.env` reads.
 */

/** Raw `DB_DRIVER` (which dialect to use); `undefined` lets the registry apply its default. */
export const dbDriver = (): string | undefined => process.env.DB_DRIVER;

/** Table-name prefix prepended to every table by the active dialect's creator. */
export const tablePrefix = (): string => process.env.DB_TABLE_PREFIX ?? '';

/** Target PostgreSQL schema (defaults to `public`; ignored on SQLite). */
export const dbSchema = (): string => process.env.DB_SCHEMA ?? 'public';

/** Configured database connection URL, if any (required for PostgreSQL; optional for SQLite). */
export const dbUrl = (): string | undefined => process.env.DB_URL;
