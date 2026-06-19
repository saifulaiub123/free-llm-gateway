import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@libsql/client';
import { runMigrations } from './migrate.js';

/**
 * Verifies the migration runner applies pending SQLite migrations and creates the
 * resulting tables. Uses a temporary, hand-written migration folder because real
 * schema entities (and their generated migrations) arrive in Phase 1; this proves
 * the runner wiring independently of any specific entity.
 */
describe('runMigrations (sqlite)', () => {
  const originalDriver = process.env.DB_DRIVER;
  const originalUrl = process.env.DB_URL;
  let root: string | undefined;

  afterEach(() => {
    if (originalDriver === undefined) delete process.env.DB_DRIVER;
    else process.env.DB_DRIVER = originalDriver;
    if (originalUrl === undefined) delete process.env.DB_URL;
    else process.env.DB_URL = originalUrl;
    // libSQL can keep the SQLite file open on Windows even after close(), so cleanup is best-effort:
    // a locked temp file must not fail the test (the OS reclaims the temp dir regardless).
    if (root) {
      try {
        rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
      } catch {
        /* ignore EBUSY: the file handle is released when the process exits */
      }
    }
    root = undefined;
  });

  it('applies a migration and creates the table', async () => {
    process.env.DB_DRIVER = 'sqlite';
    root = mkdtempSync(join(tmpdir(), 'lg-mig-'));
    const dbPath = join(root, 'test.db');
    process.env.DB_URL = `file:${dbPath}`;

    // Hand-author a minimal Drizzle migration folder (journal + one SQL file).
    const migrationsDir = join(root, 'migrations');
    mkdirSync(join(migrationsDir, 'meta'), { recursive: true });
    writeFileSync(
      join(migrationsDir, '0000_init.sql'),
      'CREATE TABLE `widgets` (`id` integer PRIMARY KEY NOT NULL);',
    );
    writeFileSync(
      join(migrationsDir, 'meta', '_journal.json'),
      JSON.stringify({
        version: '7',
        dialect: 'sqlite',
        entries: [{ idx: 0, version: '6', when: Date.now(), tag: '0000_init', breakpoints: true }],
      }),
    );

    await runMigrations(migrationsDir);

    // Re-open the migrated file with a libSQL client and assert the tables now exist.
    const client = createClient({ url: `file:${dbPath}` });
    const table = await client.execute(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'widgets'",
    );
    const tracking = await client.execute(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = '__drizzle_migrations'",
    );
    client.close();

    expect(table.rows[0]?.name).toBe('widgets');
    expect(tracking.rows[0]?.name).toBe('__drizzle_migrations');
  });
});
