import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { dbUrl } from '../../common/env.js';

/**
 * SQLite connection-path helpers. These live in the SQLite dialect module because the default file
 * location and the `file:` URL handling are SQLite-specific concerns (PostgreSQL requires `DB_URL`).
 */

/** Default SQLite database location for zero-config development. */
export const DEFAULT_SQLITE_URL = 'file:./data/llm-gateway.db';

/** Resolves the SQLite connection URL, defaulting to the local file. */
export const resolveSqliteUrl = (): string => dbUrl() ?? DEFAULT_SQLITE_URL;

/**
 * Resolves the on-disk SQLite file path from the configured URL.
 *
 * Strips a leading `file:` so both `file:./data/llm-gateway.db` and a bare path work, and passes
 * `:memory:` through unchanged for in-memory databases.
 */
export const resolveSqliteFilePath = (): string => resolveSqliteUrl().replace(/^file:/, '');

/**
 * Resolves the URL handed to the libSQL client. libSQL requires an explicit scheme, so `:memory:` and
 * any already-schemed URL (`file:`, `libsql:`, `http(s):`, `ws(s):`) pass through unchanged, while a
 * bare filesystem path (e.g. `DB_URL=./data/app.db`) is given the `file:` scheme so it still opens.
 */
export const resolveSqliteConnectionUrl = (): string => {
  const url = resolveSqliteUrl();
  if (url === ':memory:' || /^(file|libsql|https?|wss?):/i.test(url)) {
    return url;
  }
  return `file:${url}`;
};

/**
 * Ensures the parent directory of the resolved SQLite file exists before the database is opened, so a
 * fresh checkout (or any newly-configured `DB_URL` path) never fails with "unable to open database
 * file". Skips `:memory:`, which has no on-disk location. Idempotent (`recursive: true`).
 */
export const ensureParentDir = (filePath: string): void => {
  if (filePath === ':memory:') {
    return;
  }
  mkdirSync(dirname(filePath), { recursive: true });
};
