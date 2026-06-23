import { describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { createDb, type Db, type DatabaseService } from '../../database/index.js';
import { ModelRepository } from './model.repository.js';
import { UserModelRepository } from './user-model.repository.js';
import type { ModelUpsertRow } from './model-metadata.service.js';

const MODELS_DDL = sql`CREATE TABLE models (
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

const USER_MODELS_DDL = sql`CREATE TABLE user_models (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  created_by INTEGER, modified_by INTEGER, modified_at INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1, is_deleted INTEGER NOT NULL DEFAULT 0,
  user_id INTEGER NOT NULL,
  model_id INTEGER,
  custom_provider_id INTEGER,
  enabled INTEGER NOT NULL DEFAULT 1,
  is_custom INTEGER NOT NULL DEFAULT 0,
  overrides TEXT
)`;

function asDatabase(db: Db): DatabaseService {
  return { db } as unknown as DatabaseService;
}

function upsertRow(modelId: string, isFree: boolean): ModelUpsertRow {
  return {
    providerId: 1,
    modelId,
    displayName: modelId,
    isFree,
    intelligenceScore: 50,
    speedTier: 'medium',
    inputCostPer1m: 0,
    outputCostPer1m: 0,
    contextWindow: null,
    capabilities: { vision: false, tools: false, json: true, reasoning: false, embeddings: false },
    stabilityBaseline: 0.9,
  };
}

/**
 * TEST-010 foundation: fetching populates the catalog and enables exactly the free models, and a
 * re-fetch is idempotent (no duplicate rows, manual choices preserved).
 */
describe('Model repositories (fetch persistence)', () => {
  async function freshRepos(): Promise<{ models: ModelRepository; userModels: UserModelRepository }> {
    const db = createDb();
    await db.run(MODELS_DDL);
    await db.run(USER_MODELS_DDL);
    return { models: new ModelRepository(asDatabase(db)), userModels: new UserModelRepository(asDatabase(db)) };
  }

  it('upserts models and enables only the free ones, idempotently on re-fetch', async () => {
    const { models, userModels } = await freshRepos();
    const rows = [upsertRow('a', true), upsertRow('b', true), upsertRow('c', false)];

    const saved = await models.upsertMany(1, rows);
    await userModels.ensureRows(5, saved);
    // Re-run: must not duplicate models or user rows.
    const savedAgain = await models.upsertMany(1, rows);
    await userModels.ensureRows(5, savedAgain);

    expect(await models.count()).toBe(3); // 3 models, no duplicates
    const userRows = await userModels.listByUser(5);
    expect(userRows).toHaveLength(3);

    const paidModelId = saved.find((m) => m.modelId === 'c')!.id;
    const enabledByModelId = new Map(userRows.map((r) => [r.modelId, r.enabled]));
    expect(enabledByModelId.get(saved.find((m) => m.modelId === 'a')!.id)).toBe(true);
    expect(enabledByModelId.get(paidModelId)).toBe(false); // paid model disabled by default
  });
});
