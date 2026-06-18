import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
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
    if (root) rmSync(root, { recursive: true, force: true });
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

    const sqlite = new Database(dbPath);
    const table = sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'widgets'")
      .get();
    const tracking = sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = '__drizzle_migrations'")
      .get();
    sqlite.close();

    expect(table).toEqual({ name: 'widgets' });
    expect(tracking).toEqual({ name: '__drizzle_migrations' });
  });
});
