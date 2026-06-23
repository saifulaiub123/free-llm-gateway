import { describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { ensureParentDir } from './paths.js';

/**
 * Verifies the SQLite path helper creates a missing parent directory before the database is opened,
 * so a fresh checkout (or any new `DB_URL` path) does not fail with "unable to open database file".
 */
describe('ensureParentDir', () => {
  it('creates the parent directory when it does not exist', () => {
    const root = mkdtempSync(join(tmpdir(), 'lg-db-'));
    const dbFile = join(root, 'nested', 'dir', 'test.db');
    try {
      ensureParentDir(dbFile);
      expect(existsSync(dirname(dbFile))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('is a no-op for an in-memory database', () => {
    expect(() => ensureParentDir(':memory:')).not.toThrow();
  });
});
