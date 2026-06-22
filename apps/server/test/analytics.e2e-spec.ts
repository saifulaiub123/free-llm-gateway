import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { sql } from 'drizzle-orm';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { applyGlobalConfig } from '../src/app.setup.js';
import { DatabaseService, requestLogs } from '../src/database/index.js';

const REQUEST_LOGS_DDL = `CREATE TABLE request_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  user_id INTEGER NOT NULL,
  strategy_id INTEGER,
  requested_model TEXT NOT NULL,
  routed_provider TEXT, routed_model TEXT,
  fallback_attempts INTEGER NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_estimate REAL NOT NULL DEFAULT 0,
  cost_saved REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL
)`;

/**
 * Analytics endpoints (TASK-056 / TEST-009): the `/api/v1/analytics` + `/api/v1/logs` routes are
 * JWT-guarded, wrapped in the `{ data }` envelope, and scoped to the caller — a user never sees
 * another user's logs.
 */
describe('Analytics (e2e)', () => {
  let app: INestApplication;
  const jwt = new JwtService({});
  const tokenFor = (userId: number): string =>
    jwt.sign({ sub: userId, role: 'user' }, { secret: process.env.JWT_ACCESS_SECRET as string });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    applyGlobalConfig(app);
    await app.init();
    const db = app.get(DatabaseService).db;
    await db.run(sql.raw(REQUEST_LOGS_DDL));
    await db.insert(requestLogs).values([
      { userId: 1, requestedModel: 'auto', routedProvider: 'groq', status: 'success', latencyMs: 100, inputTokens: 10, outputTokens: 20, costSaved: 0.5 },
      { userId: 1, requestedModel: 'auto', status: 'error', latencyMs: 200 },
      { userId: 2, requestedModel: 'auto', routedProvider: 'mistral', status: 'success', latencyMs: 999, costSaved: 9 },
    ]);
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects an unauthenticated request with 401', async () => {
    await request(app.getHttpServer()).get('/api/v1/analytics/summary').expect(401);
  });

  it('summarizes only the caller rows (user-scoped)', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/analytics/summary')
      .set('Authorization', `Bearer ${tokenFor(1)}`)
      .expect(200);
    expect(response.body.data).toMatchObject({
      window: '24h',
      requests: 2,
      successRate: 0.5,
      totalTokens: 30,
      totalCostSaved: 0.5,
    });
  });

  it('paginates the caller logs (user-scoped, never another user)', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/logs')
      .set('Authorization', `Bearer ${tokenFor(1)}`)
      .expect(200);
    const items = response.body.data.items as Array<{ userId: number }>;
    expect(items).toHaveLength(2);
    expect(items.every((item) => item.userId === 1)).toBe(true);
  });
});
