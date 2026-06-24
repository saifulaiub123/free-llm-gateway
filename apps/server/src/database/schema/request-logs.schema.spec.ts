import { describe, expect, it } from 'vitest';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { requestLogs } from '../index.js';

const DDL = `CREATE TABLE request_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  user_id INTEGER NOT NULL,
  strategy_id INTEGER,
  provider_key_id INTEGER,
  requested_model TEXT NOT NULL,
  routed_provider TEXT,
  routed_model TEXT,
  fallback_attempts INTEGER NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_estimate REAL NOT NULL DEFAULT 0,
  cost_saved REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL
)`;

async function freshDb(): Promise<ReturnType<typeof drizzle>> {
  const client = createClient({ url: ':memory:' });
  await client.execute(DDL);
  return drizzle(client);
}

/**
 * Verifies the `request_logs` ledger round-trips with cost/token defaults applied (TASK-054); it is
 * the durable source for analytics and the cost-saved headline (TEST-009).
 */
describe('request_logs schema (TASK-054)', () => {
  it('round-trips a log row with numeric defaults and nullable routed columns', async () => {
    const db = await freshDb();
    const inserted = await db
      .insert(requestLogs)
      .values({
        userId: 1,
        requestedModel: 'auto',
        routedProvider: 'groq',
        routedModel: 'llama-3.3-70b',
        latencyMs: 120,
        status: 'success',
      })
      .returning();
    const row = inserted[0];
    expect(row?.fallbackAttempts).toBe(0);
    expect(row?.inputTokens).toBe(0);
    expect(row?.outputTokens).toBe(0);
    expect(row?.costEstimate).toBe(0);
    expect(row?.costSaved).toBe(0);
    expect(row?.createdAt).toBeInstanceOf(Date);
  });

  it('allows null routed columns for an all-failed request', async () => {
    const db = await freshDb();
    const inserted = await db
      .insert(requestLogs)
      .values({ userId: 2, requestedModel: 'auto', latencyMs: 50, status: 'error' })
      .returning();
    const row = inserted[0];
    expect(row?.routedProvider).toBeNull();
    expect(row?.routedModel).toBeNull();
    expect(row?.status).toBe('error');
  });
});
