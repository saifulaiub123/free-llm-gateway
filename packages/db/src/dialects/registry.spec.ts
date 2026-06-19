import { afterEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_DIALECT,
  dialectRegistry,
  getActiveDialect,
  isPostgres,
  resolveDialect,
} from './registry.js';
import type { SupportedDialect } from './dialect.contract.js';

/**
 * Verifies the dialect registry registers a module for every supported dialect and resolves the
 * active one from `DB_DRIVER`, since this is the Open/Closed seam for adding databases (GUD-008 /
 * PAT-009).
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

  it('registers a module for every supported dialect', () => {
    const dialects: SupportedDialect[] = ['postgres', 'sqlite'];
    for (const dialect of dialects) {
      expect(dialectRegistry[dialect].id).toBe(dialect);
      expect(typeof dialectRegistry[dialect].table).toBe('function');
      expect(typeof dialectRegistry[dialect].createDrizzle).toBe('function');
    }
    // The registry has exactly the supported dialects — no missing/extra entries.
    expect(Object.keys(dialectRegistry).sort()).toEqual([...dialects].sort());
  });

  it('falls back to the default dialect when DB_DRIVER is unset', () => {
    delete process.env.DB_DRIVER;
    expect(resolveDialect()).toBe(DEFAULT_DIALECT);
    expect(getActiveDialect().id).toBe(DEFAULT_DIALECT);
  });

  it('resolves the configured dialect from DB_DRIVER', () => {
    process.env.DB_DRIVER = 'postgres';
    expect(resolveDialect()).toBe('postgres');
    expect(getActiveDialect().id).toBe('postgres');
    expect(isPostgres()).toBe(true);
  });

  it('ignores an unrecognized DB_DRIVER and uses the default', () => {
    process.env.DB_DRIVER = 'mongodb';
    expect(resolveDialect()).toBe(DEFAULT_DIALECT);
  });
});
