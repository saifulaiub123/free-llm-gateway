import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { models } from '../index.js';

// DDL mirroring migrations/sqlite/0003_* so the in-memory db has the models table.
const MODELS_DDL = `CREATE TABLE models (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  provider_id INTEGER NOT NULL,
  model_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  is_free INTEGER NOT NULL DEFAULT 0,
  intelligence_score REAL NOT NULL DEFAULT 0,
  speed_tier TEXT NOT NULL DEFAULT 'medium',
  input_cost_per_1m REAL NOT NULL DEFAULT 0,
  output_cost_per_1m REAL NOT NULL DEFAULT 0,
  context_window INTEGER,
  capabilities TEXT NOT NULL,
  stability_baseline REAL NOT NULL DEFAULT 0.9
)`;

/** A fresh in-memory db with the `models` table, for schema round-trip checks. */
async function freshDb(): Promise<ReturnType<typeof drizzle>> {
  const client = createClient({ url: ':memory:' });
  await client.execute(MODELS_DDL);
  return drizzle(client);
}

/**
 * Verifies the `models` entity round-trips — including the JSON-encoded `capabilities` text and the
 * REAL cost/score columns — since the catalog is populated on demand by adapters (TASK-030) and read
 * by the routing engine.
 */
describe('models schema (TASK-028)', () => {
  it('round-trips a model with defaults and JSON capabilities applied', async () => {
    const db = await freshDb();
    const capabilities = JSON.stringify({
      vision: false,
      tools: true,
      json: true,
      reasoning: false,
      embeddings: false,
    });

    const inserted = await db
      .insert(models)
      .values({
        providerId: 1,
        modelId: 'llama-3.3-70b',
        displayName: 'Llama 3.3 70B',
        isFree: true,
        inputCostPer1m: 0.59,
        capabilities,
      })
      .returning();
    const model = inserted[0];
    expect(model?.isFree).toBe(true);
    expect(model?.speedTier).toBe('medium'); // column default
    expect(model?.stabilityBaseline).toBeCloseTo(0.9); // REAL default
    expect(model?.inputCostPer1m).toBeCloseTo(0.59); // REAL value preserved

    const found = (
      await db.select().from(models).where(eq(models.modelId, 'llama-3.3-70b')).limit(1)
    )[0];
    expect(JSON.parse(found!.capabilities)).toMatchObject({ tools: true, vision: false });
  });
});
