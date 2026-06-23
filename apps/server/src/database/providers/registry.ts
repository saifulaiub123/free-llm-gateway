import type { ProviderModule, SupportedProvider } from './provider.contract.js';
import { sqliteProvider } from './sqlite/index.js';
import { postgresProvider } from './postgres/index.js';
import { dbProvider } from '../common/env.js';

/** Default provider when `DB_PROVIDER` is unset — zero-config development uses SQLite. */
export const DEFAULT_PROVIDER: SupportedProvider = 'sqlite';

/**
 * Registry of every supported provider module.
 *
 * WHY `satisfies Record<SupportedProvider, ProviderModule>`: adding a provider to the union without
 * registering its module here becomes a compile error — the single guard that keeps the supported
 * set honest and makes adding a database one folder + one line (Open/Closed — GUD-008 / PAT-009).
 */
export const providerRegistry = {
  sqlite: sqliteProvider,
  postgres: postgresProvider,
} satisfies Record<SupportedProvider, ProviderModule>;

/**
 * Resolves the active dialect from `DB_DRIVER`, falling back to {@link DEFAULT_PROVIDER} when unset or
 * unrecognized (so an invalid value can never select a non-registered dialect).
 */
export const resolveProvider = (): SupportedProvider => {
  const driver = dbProvider();
  return driver && driver in providerRegistry ? (driver as SupportedProvider) : DEFAULT_PROVIDER;
};

/**
 * The active dialect module — the single source for `table`, `columnKit`, `index`, `auditExtras`,
 * `createDrizzle`, `runMigrator`, and the drizzle-kit `kit`. Common code depends only on this.
 */
export const getActiveProvider = (): ProviderModule => providerRegistry[resolveProvider()];

/** True when the configured dialect is PostgreSQL. */
export const isPostgres = (): boolean => resolveProvider() === 'postgres';
