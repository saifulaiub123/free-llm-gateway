import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { createHash } from 'node:crypto';
import { sql } from 'drizzle-orm';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { applyGlobalConfig } from '../src/app.setup.js';
import {
  DatabaseService,
  apiTokens,
  providers,
  models,
  userModels,
} from '../src/database/index.js';

const API_TOKENS_DDL = `CREATE TABLE api_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  created_by INTEGER, modified_by INTEGER, modified_at INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1, is_deleted INTEGER NOT NULL DEFAULT 0,
  user_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL, prefix TEXT NOT NULL,
  last_used_at INTEGER, revoked INTEGER NOT NULL DEFAULT 0
)`;

const PROVIDERS_DDL = `CREATE TABLE providers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  key TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL, base_url TEXT NOT NULL,
  models_endpoint TEXT, adapter_type TEXT NOT NULL,
  supports_streaming INTEGER NOT NULL DEFAULT 1, supports_tools INTEGER NOT NULL DEFAULT 0,
  supports_vision INTEGER NOT NULL DEFAULT 0, supports_embeddings INTEGER NOT NULL DEFAULT 0
)`;

const MODELS_DDL = `CREATE TABLE models (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  provider_id INTEGER NOT NULL, model_id TEXT NOT NULL, display_name TEXT NOT NULL,
  is_free INTEGER NOT NULL DEFAULT 0, intelligence_score REAL NOT NULL DEFAULT 0,
  speed_tier TEXT NOT NULL DEFAULT 'medium', input_cost_per_1m REAL NOT NULL DEFAULT 0,
  output_cost_per_1m REAL NOT NULL DEFAULT 0, context_window INTEGER,
  capabilities TEXT NOT NULL, stability_baseline REAL NOT NULL DEFAULT 0.9
)`;

const USER_MODELS_DDL = `CREATE TABLE user_models (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  created_by INTEGER, modified_by INTEGER, modified_at INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1, is_deleted INTEGER NOT NULL DEFAULT 0,
  user_id INTEGER NOT NULL, model_id INTEGER, custom_provider_id INTEGER,
  enabled INTEGER NOT NULL DEFAULT 1, is_custom INTEGER NOT NULL DEFAULT 0, overrides TEXT
)`;

const CAPABILITIES = JSON.stringify({
  vision: false,
  tools: true,
  json: true,
  reasoning: false,
  embeddings: false,
});

const TOKEN = 'sqr-llm-gateway-e2e-secret';
const TOKEN_HASH = createHash('sha256').update(TOKEN).digest('hex');

/**
 * Guard separation (TEST-008): the `/v1` gateway accepts ONLY `sqr-llm-` tokens and rejects JWTs, and
 * its responses bypass the `{ data }` envelope (CON-003). Also covers `GET /v1/models` (TASK-049).
 */
describe('Gateway /v1 (e2e)', () => {
  let app: INestApplication;
  const jwt = new JwtService({});

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    applyGlobalConfig(app);
    await app.init();
    const db = app.get(DatabaseService).db;
    for (const ddl of [API_TOKENS_DDL, PROVIDERS_DDL, MODELS_DDL, USER_MODELS_DDL]) {
      await db.run(sql.raw(ddl));
    }
    await db.insert(apiTokens).values({ userId: 1, tokenHash: TOKEN_HASH, name: 'e2e', prefix: 'sqr-llm-gate' });
    const provider = (
      await db
        .insert(providers)
        .values({ key: 'groq', displayName: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', adapterType: 'groq' })
        .returning()
    )[0]!;
    const enabledModel = (
      await db
        .insert(models)
        .values({ providerId: provider.id, modelId: 'llama-3.3-70b', displayName: 'Llama 3.3 70B', isFree: true, capabilities: CAPABILITIES })
        .returning()
    )[0]!;
    const disabledModel = (
      await db
        .insert(models)
        .values({ providerId: provider.id, modelId: 'disabled-model', displayName: 'Disabled', isFree: true, capabilities: CAPABILITIES })
        .returning()
    )[0]!;
    await db.insert(userModels).values([
      { userId: 1, modelId: enabledModel.id, enabled: true },
      { userId: 1, modelId: disabledModel.id, enabled: false },
    ]);
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects a JWT on /v1 (wrong credential type) with 401', async () => {
    const token = jwt.sign({ sub: 1, role: 'user' }, { secret: process.env.JWT_ACCESS_SECRET as string });
    await request(app.getHttpServer())
      .get('/v1/models')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });

  it('rejects an unauthenticated request with 401', async () => {
    await request(app.getHttpServer()).get('/v1/models').expect(401);
  });

  it('lists only the caller\'s enabled models in raw OpenAI shape (no envelope)', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/models')
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);
    expect(response.body).toEqual({
      object: 'list',
      data: [{ id: 'llama-3.3-70b', object: 'model', owned_by: 'groq' }],
    });
  });
});
