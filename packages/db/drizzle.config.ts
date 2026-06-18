import type { Config } from 'drizzle-kit';
import { resolveDatabaseUrl } from './src/db-paths';

/**
 * Drizzle Kit configuration, branched by the active dialect.
 *
 * WHY per-dialect `out`: Postgres and SQLite produce different SQL, so each dialect keeps its own
 * migration folder. The dialect comes from `DB_DRIVER` (SQLite by default for zero-config dev),
 * mirroring the connection factory and table-factory registry so migration generation always
 * matches the runtime driver.
 */
const isPostgres = (process.env.DB_DRIVER ?? 'sqlite') === 'postgres';

export default {
  schema: './src/schema/index.ts',
  out: isPostgres ? './migrations/postgres' : './migrations/sqlite',
  dialect: isPostgres ? 'postgresql' : 'sqlite',
  dbCredentials: { url: resolveDatabaseUrl() },
} satisfies Config;
