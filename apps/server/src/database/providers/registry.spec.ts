import { afterEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_PROVIDER,
  providerRegistry,
  getActiveProvider,
  isPostgres,
  resolveProvider,
} from './registry.js';
import type { SupportedProvider } from './provider.contract.js';

/**
 * Verifies the provider registry registers a module for every supported provider and resolves the
 * active one from `DB_PROVIDER`, since this is the Open/Closed seam for adding databases (GUD-008 /
 * PAT-009).
 */
describe('provider registry', () => {
  const originalProvider = process.env.DB_PROVIDER;

  afterEach(() => {
    if (originalProvider === undefined) {
      delete process.env.DB_PROVIDER;
    } else {
      process.env.DB_PROVIDER = originalProvider;
    }
  });

  it('registers a module for every supported provider', () => {
    const providers: SupportedProvider[] = ['postgres', 'sqlite'];
    for (const provider of providers) {
      expect(providerRegistry[provider].id).toBe(provider);
      expect(typeof providerRegistry[provider].table).toBe('function');
      expect(typeof providerRegistry[provider].createDrizzle).toBe('function');
    }
    // The registry has exactly the supported providers — no missing/extra entries.
    expect(Object.keys(providerRegistry).sort()).toEqual([...providers].sort());
  });

  it('falls back to the default provider when DB_PROVIDER is unset', () => {
    delete process.env.DB_PROVIDER;
    expect(resolveProvider()).toBe(DEFAULT_PROVIDER);
    expect(getActiveProvider().id).toBe(DEFAULT_PROVIDER);
  });

  it('resolves the configured provider from DB_PROVIDER', () => {
    process.env.DB_PROVIDER = 'postgres';
    expect(resolveProvider()).toBe('postgres');
    expect(getActiveProvider().id).toBe('postgres');
    expect(isPostgres()).toBe(true);
  });

  it('ignores an unrecognized DB_PROVIDER and uses the default', () => {
    process.env.DB_PROVIDER = 'mongodb';
    expect(resolveProvider()).toBe(DEFAULT_PROVIDER);
  });
});
