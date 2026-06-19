import { afterEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_PROVIDER,
  providerRegistry,
  getActiveProvider,
  isPostgres,
  resolveProvider,
} from './registry.js';
import type { SupportedProvider } from './dialect.contract.js';

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
    const dialects: SupportedProvider[] = ['postgres', 'sqlite'];
    for (const dialect of dialects) {
      expect(providerRegistry[dialect].id).toBe(dialect);
      expect(typeof providerRegistry[dialect].table).toBe('function');
      expect(typeof providerRegistry[dialect].createDrizzle).toBe('function');
    }
    // The registry has exactly the supported dialects — no missing/extra entries.
    expect(Object.keys(providerRegistry).sort()).toEqual([...dialects].sort());
  });

  it('falls back to the default dialect when DB_DRIVER is unset', () => {
    delete process.env.DB_DRIVER;
    expect(resolveProvider()).toBe(DEFAULT_PROVIDER);
    expect(getActiveProvider().id).toBe(DEFAULT_PROVIDER);
  });

  it('resolves the configured dialect from DB_DRIVER', () => {
    process.env.DB_DRIVER = 'postgres';
    expect(resolveProvider()).toBe('postgres');
    expect(getActiveProvider().id).toBe('postgres');
    expect(isPostgres()).toBe(true);
  });

  it('ignores an unrecognized DB_DRIVER and uses the default', () => {
    process.env.DB_DRIVER = 'mongodb';
    expect(resolveProvider()).toBe(DEFAULT_PROVIDER);
  });
});
