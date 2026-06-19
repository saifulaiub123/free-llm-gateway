import type { DialectModule, SupportedDialect } from './dialect.contract.js';
import { sqliteDialect } from './sqlite/index.js';
import { postgresDialect } from './postgres/index.js';
import { dbDriver } from '../common/env.js';

/** Default dialect when `DB_DRIVER` is unset — zero-config development uses SQLite. */
export const DEFAULT_DIALECT: SupportedDialect = 'sqlite';

/**
 * Registry of every supported dialect module.
 *
 * WHY `satisfies Record<SupportedDialect, DialectModule>`: adding a dialect to the union without
 * registering its module here becomes a compile error — the single guard that keeps the supported
 * set honest and makes adding a database one folder + one line (Open/Closed — GUD-008 / PAT-009).
 */
export const dialectRegistry = {
  sqlite: sqliteDialect,
  postgres: postgresDialect,
} satisfies Record<SupportedDialect, DialectModule>;

/**
 * Resolves the active dialect from `DB_DRIVER`, falling back to {@link DEFAULT_DIALECT} when unset or
 * unrecognized (so an invalid value can never select a non-registered dialect).
 */
export const resolveDialect = (): SupportedDialect => {
  const driver = dbDriver();
  return driver && driver in dialectRegistry ? (driver as SupportedDialect) : DEFAULT_DIALECT;
};

/**
 * The active dialect module — the single source for `table`, `columnKit`, `index`, `auditExtras`,
 * `createDrizzle`, `runMigrator`, and the drizzle-kit `kit`. Common code depends only on this.
 */
export const getActiveDialect = (): DialectModule => dialectRegistry[resolveDialect()];

/** True when the configured dialect is PostgreSQL. */
export const isPostgres = (): boolean => resolveDialect() === 'postgres';
