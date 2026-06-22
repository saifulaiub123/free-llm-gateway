import { describe, expect, it } from 'vitest';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { rateLimitCounters } from '../index.js';

const DDL = `CREATE TABLE rate_limit_counters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  user_id INTEGER NOT NULL,
  provider_id INTEGER NOT NULL,
  model_id INTEGER NOT NULL,
  key_id INTEGER NOT NULL,
  window TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  window_start INTEGER NOT NULL
)`;

async function freshDb(): Promise<ReturnType<typeof drizzle>> {
  const client = createClient({ url: ':memory:' });
  await client.execute(DDL);
  return drizzle(client);
}

/**
 * Verifies the `rate_limit_counters` ledger round-trips with the `count` default applied (TASK-033),
 * since the router reads remaining headroom from these per-`(user, provider, model, key, window)`
 * rows (TEST-012).
 */
describe('rate_limit_counters schema (TASK-033)', () => {
  it('round-trips a counter row with the count default applied', async () => {
    const db = await freshDb();
    const inserted = await db
      .insert(rateLimitCounters)
      .values({ userId: 1, providerId: 2, modelId: 3, keyId: 4, window: 'rpm', windowStart: new Date() })
      .returning();
    const row = inserted[0];
    expect(row?.count).toBe(0); // default
    expect(row?.window).toBe('rpm');
    expect(row?.windowStart).toBeInstanceOf(Date);
  });
});
