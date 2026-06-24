import { beforeEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { createDb, type Db, type DatabaseService } from '../../database/index.js';
import { RequestLogRepository } from './request-log.repository.js';

const CREATE_REQUEST_LOGS = sql`CREATE TABLE request_logs (
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

/** Minimal models table for the LEFT JOIN in page(). */
const CREATE_MODELS = sql`CREATE TABLE models (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  provider_id INTEGER NOT NULL,
  model_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  is_free INTEGER DEFAULT 0 NOT NULL,
  intelligence_score REAL DEFAULT 0 NOT NULL,
  speed_tier TEXT DEFAULT 'medium' NOT NULL,
  input_cost_per_1m REAL DEFAULT 0 NOT NULL,
  output_cost_per_1m REAL DEFAULT 0 NOT NULL,
  context_window INTEGER,
  capabilities TEXT NOT NULL DEFAULT '{}',
  stability_baseline REAL DEFAULT 0.9 NOT NULL
)`;

async function freshDb(): Promise<Db> {
  const db = createDb();
  await db.run(CREATE_REQUEST_LOGS);
  await db.run(CREATE_MODELS);
  return db;
}

function asDatabase(db: Db): DatabaseService {
  return { db } as unknown as DatabaseService;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Exercises the analytics aggregate queries against a real SQLite db (TEST-009): summaries must
 * aggregate ONLY the caller's rows and windowing must exclude old rows.
 */
describe('RequestLogRepository summaries (TASK-056)', () => {
  let repo: RequestLogRepository;

  beforeEach(async () => {
    repo = new RequestLogRepository(asDatabase(await freshDb()));
  });

  it('summary aggregates only the caller rows within the window', async () => {
    await repo.create({
      userId: 1,
      requestedModel: 'auto',
      routedProvider: 'groq',
      status: 'success',
      latencyMs: 100,
      inputTokens: 10,
      outputTokens: 20,
      costSaved: 0.5,
    });
    await repo.create({
      userId: 1,
      requestedModel: 'auto',
      status: 'error',
      latencyMs: 300,
      costSaved: 0,
    });
    // Another user's row must NOT leak into user 1's totals.
    await repo.create({ userId: 2, requestedModel: 'auto', status: 'success', latencyMs: 999 });

    const summary = await repo.summary(1, new Date(Date.now() - DAY_MS));
    expect(summary.requests).toBe(2);
    expect(summary.successes).toBe(1);
    expect(summary.totalTokens).toBe(30);
    expect(summary.totalCostSaved).toBeCloseTo(0.5, 6);
    expect(summary.avgLatencyMs).toBe(200);
  });

  it('windowing excludes rows older than the window', async () => {
    await repo.create({ userId: 1, requestedModel: 'auto', status: 'success', latencyMs: 100 });
    await repo.create({
      userId: 1,
      requestedModel: 'auto',
      status: 'success',
      latencyMs: 100,
      createdAt: new Date(Date.now() - 2 * DAY_MS), // outside a 24h window
    });

    const summary = await repo.summary(1, new Date(Date.now() - DAY_MS));
    expect(summary.requests).toBe(1);
  });

  it('byProvider groups the caller rows by routed provider', async () => {
    await repo.create({ userId: 1, requestedModel: 'auto', routedProvider: 'groq', status: 'success', latencyMs: 10, costSaved: 1 });
    await repo.create({ userId: 1, requestedModel: 'auto', routedProvider: 'groq', status: 'success', latencyMs: 30, costSaved: 2 });
    await repo.create({ userId: 1, requestedModel: 'auto', routedProvider: 'mistral', status: 'success', latencyMs: 50, costSaved: 0 });

    const rows = await repo.byProvider(1, new Date(Date.now() - DAY_MS));
    const groq = rows.find((row) => row.provider === 'groq');
    expect(groq?.requests).toBe(2);
    expect(groq?.totalCostSaved).toBeCloseTo(3, 6);
    expect(rows[0]?.provider).toBe('groq'); // busiest first
  });
});

/** Exercises keyset pagination and retention pruning. */
describe('RequestLogRepository pagination + prune (TASK-056)', () => {
  let repo: RequestLogRepository;

  beforeEach(async () => {
    repo = new RequestLogRepository(asDatabase(await freshDb()));
  });

  it('paginates newest-first with a stable keyset cursor', async () => {
    for (const model of ['a', 'b', 'c']) {
      await repo.create({ userId: 1, requestedModel: model, status: 'success', latencyMs: 1 });
    }

    const first = await repo.page(1, 2);
    expect(first.items).toHaveLength(2);
    expect(first.items[0]?.requestedModel).toBe('c'); // newest first
    expect(first.nextCursor).toBe(first.items[1]?.id);

    const second = await repo.page(1, 2, first.nextCursor ?? undefined);
    expect(second.items).toHaveLength(1);
    expect(second.items[0]?.requestedModel).toBe('a');
    expect(second.nextCursor).toBeNull();
  });

  it('pruneOlderThan removes only rows older than the cutoff', async () => {
    await repo.create({ userId: 1, requestedModel: 'new', status: 'success', latencyMs: 1 });
    await repo.create({
      userId: 1,
      requestedModel: 'old',
      status: 'success',
      latencyMs: 1,
      createdAt: new Date(Date.now() - 10 * DAY_MS),
    });

    await repo.pruneOlderThan(new Date(Date.now() - 5 * DAY_MS));

    const page = await repo.page(1, 50);
    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.requestedModel).toBe('new');
  });
});
