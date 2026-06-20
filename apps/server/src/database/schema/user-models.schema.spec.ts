import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { userModels } from '../index.js';

// DDL mirroring migrations/sqlite/0004_* so the in-memory db has the user_models table.
const USER_MODELS_DDL = `CREATE TABLE user_models (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  created_by INTEGER,
  modified_by INTEGER,
  modified_at INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  user_id INTEGER NOT NULL,
  model_id INTEGER,
  custom_provider_id INTEGER,
  enabled INTEGER NOT NULL DEFAULT 1,
  is_custom INTEGER NOT NULL DEFAULT 0,
  overrides TEXT
)`;

/** A fresh in-memory db with the `user_models` table. */
async function freshDb(): Promise<ReturnType<typeof drizzle>> {
  const client = createClient({ url: ':memory:' });
  await client.execute(USER_MODELS_DDL);
  return drizzle(client);
}

/**
 * Verifies the `user_models` entity round-trips for both a catalog enable/disable row and a
 * fully-custom row (TASK-029), since per-user enable/disable + custom models drive the user catalog
 * (TASK-031) and routing candidate set.
 */
describe('user_models schema (TASK-029)', () => {
  it('round-trips a catalog enable row with defaults applied', async () => {
    const db = await freshDb();
    const inserted = await db.insert(userModels).values({ userId: 1, modelId: 5 }).returning();
    const row = inserted[0];
    expect(row?.enabled).toBe(true); // default
    expect(row?.isCustom).toBe(false); // default
    expect(row?.overrides).toBeNull();
    expect(row?.customProviderId).toBeNull();
  });

  it('round-trips a fully-custom row (null modelId, custom details in overrides)', async () => {
    const db = await freshDb();
    const overrides = JSON.stringify({
      modelId: 'my-llm',
      displayName: 'My LLM',
      inputCostPer1m: 0,
      outputCostPer1m: 0,
    });
    await db
      .insert(userModels)
      .values({ userId: 1, isCustom: true, customProviderId: 2, overrides });

    const found = (
      await db.select().from(userModels).where(eq(userModels.userId, 1)).limit(1)
    )[0];
    expect(found?.modelId).toBeNull();
    expect(found?.isCustom).toBe(true);
    expect(JSON.parse(found!.overrides!)).toMatchObject({ modelId: 'my-llm', displayName: 'My LLM' });
  });
});
