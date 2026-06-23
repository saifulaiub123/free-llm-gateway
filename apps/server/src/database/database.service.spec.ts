import { afterEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { DatabaseService } from './database.service.js';

/**
 * Verifies {@link DatabaseService} opens a usable connection on init and closes it on destroy, since
 * the whole app reads its `db` getter and relies on graceful shutdown (RDB-012). `setup-env.ts` pins
 * DB_PROVIDER=sqlite + DB_URL=:memory:, so this exercises the libSQL provider end-to-end.
 */
describe('DatabaseService', () => {
  const originalProvider = process.env.DB_PROVIDER;
  const originalUrl = process.env.DB_URL;

  afterEach(() => {
    if (originalProvider === undefined) delete process.env.DB_PROVIDER;
    else process.env.DB_PROVIDER = originalProvider;
    if (originalUrl === undefined) delete process.env.DB_URL;
    else process.env.DB_URL = originalUrl;
  });

  it('throws if db is read before onModuleInit', () => {
    const service = new DatabaseService();
    expect(() => service.db).toThrow();
  });

  it('opens a working connection on init and closes it on destroy', async () => {
    process.env.DB_PROVIDER = 'sqlite';
    process.env.DB_URL = ':memory:';
    const service = new DatabaseService();
    service.onModuleInit();

    const rows = (await service.db.all(sql`select 1 as one`)) as Array<{ one: number }>;
    expect(rows).toEqual([{ one: 1 }]);

    await service.onModuleDestroy();
    expect(() => service.db).toThrow();
  });
});
