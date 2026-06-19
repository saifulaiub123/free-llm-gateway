import { afterEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { createDb } from './connection.js';

/**
 * Verifies the connection factory builds a working Drizzle client for the
 * configured provider, since every repository depends on this single handle.
 */
describe('connection factory', () => {
  const originalProvider = process.env.DB_PROVIDER;
  const originalUrl = process.env.DB_URL;

  afterEach(() => {
    // Restore env so connection tests do not leak provider/url state.
    if (originalProvider === undefined) delete process.env.DB_PROVIDER;
    else process.env.DB_PROVIDER = originalProvider;
    if (originalUrl === undefined) delete process.env.DB_URL;
    else process.env.DB_URL = originalUrl;
  });

  it('connects with an in-memory SQLite database and runs select 1', async () => {
    process.env.DB_PROVIDER = 'sqlite';
    process.env.DB_URL = ':memory:';

    // DB_PROVIDER pins the provider, so the handle is the libSQL (SQLite) client here.
    const db = createDb();
    const rows = (await db.all(sql`select 1 as one`)) as Array<{ one: number }>;

    expect(rows).toEqual([{ one: 1 }]);
  });

  it('defaults to SQLite when DB_PROVIDER is unset', async () => {
    delete process.env.DB_PROVIDER;
    process.env.DB_URL = ':memory:';

    const db = createDb();
    const rows = (await db.all(sql`select 42 as answer`)) as Array<{ answer: number }>;

    expect(rows).toEqual([{ answer: 42 }]);
  });
});
