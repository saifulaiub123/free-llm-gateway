import Database from 'better-sqlite3';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import type { Db, Schema } from '../../types.js';
import { resolveSqliteFilePath } from './paths.js';

/**
 * Builds a SQLite-backed Drizzle client at the configured file path (or `:memory:`).
 *
 * WHY `schema` is a parameter: the common connection factory imports the schema barrel and passes it
 * in, so this dialect module never imports `schema/` itself (which would create an import cycle:
 * schema → registry → dialect → schema).
 */
export const createSqliteDrizzle = (schema: Schema): Db => {
  const sqlite = new Database(resolveSqliteFilePath());
  return drizzleSqlite(sqlite, { schema });
};
