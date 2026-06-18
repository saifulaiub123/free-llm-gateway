import { afterEach, describe, expect, it } from 'vitest';
import { getTableName } from 'drizzle-orm';
import { integer, sqliteTable } from 'drizzle-orm/sqlite-core';
import {
  DEFAULT_DIALECT,
  resolveDialect,
  sqliteTable as factorySqliteTable,
  tableCreators,
  type SupportedDialect,
} from './table-factory.js';

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

/**
 * Verifies the dialect registry exposes a creator for every supported dialect and
 * resolves the active dialect from `DB_DRIVER`, since this is the Open/Closed seam
 * for adding new databases (GUD-008 / PAT-006).
 */
describe('dialect registry', () => {
  const originalDriver = process.env.DB_DRIVER;

  afterEach(() => {
    if (originalDriver === undefined) {
      delete process.env.DB_DRIVER;
    } else {
      process.env.DB_DRIVER = originalDriver;
    }
  });

  it('registers a table creator for every supported dialect', () => {
    const dialects: SupportedDialect[] = ['postgres', 'sqlite'];
    for (const dialect of dialects) {
      expect(typeof tableCreators[dialect]).toBe('function');
    }
    // The registry has exactly the supported dialects — no missing/extra entries.
    expect(Object.keys(tableCreators).sort()).toEqual([...dialects].sort());
  });

  it('falls back to the default dialect when DB_DRIVER is unset', () => {
    delete process.env.DB_DRIVER;
    expect(resolveDialect()).toBe(DEFAULT_DIALECT);
  });

  it('resolves the configured dialect from DB_DRIVER', () => {
    process.env.DB_DRIVER = 'postgres';
    expect(resolveDialect()).toBe('postgres');
  });
});
