import { pgTableCreator } from 'drizzle-orm/pg-core';
import type { TableCreator } from '../dialect.contract.js';
import { tablePrefix } from '../../common/env.js';

/**
 * PostgreSQL table creator that applies the configurable `DB_TABLE_PREFIX`. The runtime value is a
 * genuine `pg-core` creator (so drizzle-kit emits correct DDL); it is cast to the canonical
 * {@link TableCreator} type so the single `schema/` authored against the kit type-checks.
 */
export const pgTable = pgTableCreator((name) => `${tablePrefix()}${name}`) as unknown as TableCreator;
