import type { ProviderModule, SupportedProvider } from './provider.contract.js';
import { sqliteDialect } from './sqlite/index.js';
import { postgresDialect } from './postgres/index.js';
import { dbProvider } from '../common/env.js';

/** Default dialect when `DB_DRIVER` is unset — zero-config development uses SQLite. */
export const DEFAULT_PROVIDER: SupportedProvider = 'sqlite';

/**
 * Registry of every supported dialect module.
 *
 * WHY `satisfies Record<SupportedDialect, DialectModule>`: adding a dialect to the union without
 * registering its module here becomes a compile error — the single guard that keeps the supported
 * set honest and makes adding a database one folder + one line (Open/Closed — GUD-008 / PAT-009).
 */
export const providerRegistry = {
  sqlite: sqliteDialect,
  postgres: postgresDialect,
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
