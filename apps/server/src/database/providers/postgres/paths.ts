import { Pool } from 'pg';
import { dbSchema, dbUrl } from '../../common/env.js';

/**
 * Resolves the PostgreSQL connection URL. Unlike SQLite there is no file default: when `DB_URL` is
 * unset we return an empty string so the `pg` driver falls back to standard `PG*` environment vars.
 */
export const resolvePostgresUrl = (): string => dbUrl() ?? '';

/**
 * Creates a `pg` pool whose every connection pins `search_path` to `DB_SCHEMA`.
 *
 * WHY a per-connection `SET search_path`: PostgreSQL has no per-statement schema, so honoring the
 * configurable `DB_SCHEMA` means every pooled client must resolve unqualified table names against it.
 * This makes both the migrator and the runtime repositories land in (and read from) the same schema,
 * so `DB_SCHEMA` works identically at migrate time and request time. Used by both `connection.ts` and
 * `migrate.ts` so the two never drift.
 */
export const createPostgresPool = (): Pool => {
  const connectionString = resolvePostgresUrl();
  const pool = connectionString ? new Pool({ connectionString }) : new Pool();
  const schema = dbSchema();
  pool.on('connect', (client) => {
    void client.query(`SET search_path TO "${schema}"`);
  });
  return pool;
};

