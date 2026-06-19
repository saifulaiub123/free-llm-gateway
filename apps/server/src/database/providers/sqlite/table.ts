import { sqliteTableCreator } from 'drizzle-orm/sqlite-core';
import { tablePrefix } from '../../common/env.js';

/**
 * SQLite table creator that applies the configurable `DB_TABLE_PREFIX` to every table name.
 *
 * WHY a getter-backed creator: the prefix is read lazily on each table creation so tests can vary
 * `DB_TABLE_PREFIX` within one process. SQLite has no schemas, so `DB_SCHEMA` is ignored gracefully.
 */
export const sqliteTable = sqliteTableCreator((name) => `${tablePrefix()}${name}`);
