import { afterEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { createDb } from './connection.js';

/**
 * Verifies the connection factory builds a working Drizzle client for the
 * configured dialect, since every repository depends on this single handle.
 */
describe('connection factory', () => {
  const originalDriver = process.env.DB_DRIVER;
  const originalUrl = process.env.DB_URL;

  afterEach(() => {
    // Restore env so connection tests do not leak driver/url state.
    if (originalDriver === undefined) delete process.env.DB_DRIVER;
    else process.env.DB_DRIVER = originalDriver;
    if (originalUrl === undefined) delete process.env.DB_URL;
    else process.env.DB_URL = originalUrl;
  });

  it('connects with an in-memory SQLite database and runs select 1', () => {
    process.env.DB_DRIVER = 'sqlite';
    process.env.DB_URL = ':memory:';

    // DB_DRIVER pins the dialect, so the handle is the SQLite variant here.
    const db = createDb() as BetterSQLite3Database;
    const rows = db.all(sql`select 1 as one`) as Array<{ one: number }>;

    expect(rows).toEqual([{ one: 1 }]);
  });

  it('defaults to SQLite when DB_DRIVER is unset', () => {
    delete process.env.DB_DRIVER;
    process.env.DB_URL = ':memory:';

    const db = createDb() as BetterSQLite3Database;
    const rows = db.all(sql`select 42 as answer`) as Array<{ answer: number }>;

    expect(rows).toEqual([{ answer: 42 }]);
  });
});
