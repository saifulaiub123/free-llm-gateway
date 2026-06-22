import { describe, expect, it } from 'vitest';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { modelRuntimeStats } from '../index.js';

const DDL = `CREATE TABLE model_runtime_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  user_id INTEGER NOT NULL,
  model_id INTEGER NOT NULL,
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  avg_latency_ms REAL NOT NULL DEFAULT 0,
  last_success_at INTEGER,
  updated_at INTEGER NOT NULL
)`;

async function freshDb(): Promise<ReturnType<typeof drizzle>> {
  const client = createClient({ url: ':memory:' });
  await client.execute(DDL);
  return drizzle(client);
}

/**
 * Verifies the `model_runtime_stats` aggregate round-trips with count/latency defaults (TASK-035);
 * auto-strategies read stability (success rate) + speed (avg latency) from here (TEST-012).
 */
describe('model_runtime_stats schema (TASK-035)', () => {
  it('round-trips a stats row with count/latency defaults applied', async () => {
    const db = await freshDb();
    const inserted = await db
      .insert(modelRuntimeStats)
      .values({ userId: 1, modelId: 2, updatedAt: new Date() })
      .returning();
    const row = inserted[0];
    expect(row?.successCount).toBe(0);
    expect(row?.failureCount).toBe(0);
    expect(row?.avgLatencyMs).toBe(0);
    expect(row?.lastSuccessAt).toBeNull();
    expect(row?.updatedAt).toBeInstanceOf(Date);
  });
});
