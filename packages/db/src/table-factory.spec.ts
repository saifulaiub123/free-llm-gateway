import { afterEach, describe, expect, it } from 'vitest';
import { getTableName } from 'drizzle-orm';
import { integer, sqliteTable } from 'drizzle-orm/sqlite-core';
import { sqliteTable as factorySqliteTable } from './table-factory.js';

/**
 * Verifies the table factory applies the configurable `DB_TABLE_PREFIX` to every
 * table name, since this is the single naming convention all entities depend on.
 */
describe('table factory prefixing', () => {
  const originalPrefix = process.env.DB_TABLE_PREFIX;

  afterEach(() => {
    // Restore env so tests do not leak prefix state into one another.
    if (originalPrefix === undefined) {
      delete process.env.DB_TABLE_PREFIX;
    } else {
      process.env.DB_TABLE_PREFIX = originalPrefix;
    }
  });

  it('prefixes the table name when DB_TABLE_PREFIX is set', () => {
    process.env.DB_TABLE_PREFIX = 'lg_';
    const users = factorySqliteTable('users', { id: integer('id').primaryKey() });
    expect(getTableName(users)).toBe('lg_users');
  });

  it('leaves the table name unprefixed when DB_TABLE_PREFIX is empty', () => {
    process.env.DB_TABLE_PREFIX = '';
    const users = factorySqliteTable('users', { id: integer('id').primaryKey() });
    expect(getTableName(users)).toBe('users');
  });

  it('matches an unprefixed plain drizzle table when no prefix is configured', () => {
    process.env.DB_TABLE_PREFIX = '';
    const factory = factorySqliteTable('providers', { id: integer('id').primaryKey() });
    const plain = sqliteTable('providers', { id: integer('id').primaryKey() });
    expect(getTableName(factory)).toBe(getTableName(plain));
  });
});
