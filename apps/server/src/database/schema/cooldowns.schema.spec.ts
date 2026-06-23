import { describe, expect, it } from 'vitest';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { cooldowns } from '../index.js';

const DDL = `CREATE TABLE cooldowns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  key_id INTEGER,
  model_id INTEGER,
  until INTEGER NOT NULL,
  reason TEXT NOT NULL
)`;

async function freshDb(): Promise<ReturnType<typeof drizzle>> {
  const client = createClient({ url: ':memory:' });
  await client.execute(DDL);
  return drizzle(client);
}

/**
 * Verifies the `cooldowns` ledger round-trips with a nullable target (TASK-034); the router skips a
 * key/model until `until` after a `429`/`5xx` (TEST-012).
 */
describe('cooldowns schema (TASK-034)', () => {
  it('round-trips a key cooldown with a null model target', async () => {
    const db = await freshDb();
    const until = new Date(Date.now() + 60_000);
    const inserted = await db
      .insert(cooldowns)
      .values({ keyId: 7, until, reason: 'rate_limited' })
      .returning();
    const row = inserted[0];
    expect(row?.keyId).toBe(7);
    expect(row?.modelId).toBeNull();
    expect(row?.reason).toBe('rate_limited');
    expect(row?.until).toBeInstanceOf(Date);
  });
});
