import { Pool, type PoolConfig } from 'pg';
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
 *
 * The `search_path` is embedded as a PostgreSQL connection `options` parameter rather than set
 * via the pool `connect` event handler. WHY: pg-pool fires the `connect` event synchronously and
 * does NOT await async handlers — any `client.query()` call there races against the first consumer
 * query, causing both a pg 8.x deprecation warning (concurrent `query()` on one client) and tables
 * landing in the wrong schema. Connection-string options are applied server-side before the first
 * user query, so there is no race.
 */
export const createPostgresPool = (): Pool => {
  const rawUrl = resolvePostgresUrl();
  const schema = dbSchema();
  // Fail-fast when PostgreSQL is unreachable (default pg timeout is 0 = OS TCP timeout ~minutes).
  const config: PoolConfig = { connectionTimeoutMillis: 5_000 };

  if (rawUrl) {
    // Embed search_path as a startup option so every connection starts in the right schema.
    // Format: -c name=value is a PostgreSQL server parameter override.
    const url = new URL(rawUrl);
    const existing = url.searchParams.get('options') ?? '';
    url.searchParams.set(
      'options',
      existing ? `${existing} -c search_path=${schema}` : `-c search_path=${schema}`,
    );
    config.connectionString = url.toString();
  }

  return new Pool(config);
};

