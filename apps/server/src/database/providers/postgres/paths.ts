import { dbUrl } from '../../common/env.js';

/**
 * Resolves the PostgreSQL connection URL. Unlike SQLite there is no file default: when `DB_URL` is
 * unset we return an empty string so the `pg` driver falls back to standard `PG*` environment vars.
 */
export const resolvePostgresUrl = (): string => dbUrl() ?? '';
