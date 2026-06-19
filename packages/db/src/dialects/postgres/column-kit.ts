import { boolean, integer, serial, text, timestamp } from 'drizzle-orm/pg-core';
import type { ColumnKit } from '../dialect.contract.js';

/**
 * Real `pg-core` builders cast to the canonical (SQLite-typed) {@link ColumnKit}. The runtime objects
 * are genuine PostgreSQL builders (so drizzle-kit emits correct DDL); the cast only aligns the
 * compile-time surface so the single `schema/` authored against the kit type-checks. Inferred row
 * types match across dialects (Date / boolean / number / string), so repositories stay type-safe.
 */
export const postgresColumnKit = {
  pk: (name = 'id') => serial(name).primaryKey(),
  createdAt: (name = 'created_at') => timestamp(name, { withTimezone: true }).notNull().defaultNow(),
  timestamp: (name: string) => timestamp(name, { withTimezone: true }),
  boolean: (name: string) => boolean(name),
  integer: (name: string) => integer(name),
  text: <T extends string>(name: string, config?: { enum: readonly [T, ...T[]] }) =>
    config ? text(name, config) : text(name),
} as unknown as ColumnKit;
