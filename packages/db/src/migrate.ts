import { fileURLToPath } from 'node:url';
import { getActiveDialect } from './dialects/registry.js';

/**
 * Applies all pending migrations for the configured dialect.
 *
 * WHY a single entrypoint: deployment and tests run one command regardless of driver; the active
 * dialect module owns its own short-lived migrator connection and (for PostgreSQL) the
 * `CREATE SCHEMA IF NOT EXISTS` pre-step. `migrationsFolder` can be overridden for tests.
 */
export const runMigrations = (migrationsFolder?: string): Promise<void> =>
  getActiveDialect().runMigrator(migrationsFolder);

// When executed directly (`pnpm db:migrate`), run migrations and surface failures as a non-zero exit.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runMigrations().catch((error: unknown) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}
