import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createHash } from 'node:crypto';
import { sql } from 'drizzle-orm';
import request from 'supertest';
import { AdapterRegistry, UpstreamError, type ChatResponse } from '@gateway/provider-adapters';
import { AppModule } from '../src/app.module.js';
import { applyGlobalConfig } from '../src/app.setup.js';
import { EncryptionService } from '../src/common/crypto/encryption.service.js';
import {
  DatabaseService,
  apiTokens,
  providers,
  userProviderKeys,
  models,
  userModels,
} from '../src/database/index.js';

const TOKEN = 'sqr-llm-chat-e2e-secret';
const TOKEN_HASH = createHash('sha256').update(TOKEN).digest('hex');

const CAPABILITIES = JSON.stringify({ vision: false, tools: true, json: true });

const DDL = {
  apiTokens: `CREATE TABLE api_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT, created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    created_by INTEGER, modified_by INTEGER, modified_at INTEGER,
    is_active INTEGER NOT NULL DEFAULT 1, is_deleted INTEGER NOT NULL DEFAULT 0,
    user_id INTEGER NOT NULL, token_hash TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
    prefix TEXT NOT NULL, last_used_at INTEGER, revoked INTEGER NOT NULL DEFAULT 0)`,
  providers: `CREATE TABLE providers (
    id INTEGER PRIMARY KEY AUTOINCREMENT, created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    key TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL, base_url TEXT NOT NULL,
    models_endpoint TEXT, adapter_type TEXT NOT NULL,
    supports_streaming INTEGER NOT NULL DEFAULT 1, supports_tools INTEGER NOT NULL DEFAULT 0,
    supports_vision INTEGER NOT NULL DEFAULT 0, supports_embeddings INTEGER NOT NULL DEFAULT 0)`,
  keys: `CREATE TABLE user_provider_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT, created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    created_by INTEGER, modified_by INTEGER, modified_at INTEGER,
    is_active INTEGER NOT NULL DEFAULT 1, is_deleted INTEGER NOT NULL DEFAULT 0,
    user_id INTEGER NOT NULL, provider_id INTEGER NOT NULL, encrypted_key TEXT NOT NULL,
    label TEXT, status TEXT NOT NULL DEFAULT 'healthy', last_checked_at INTEGER)`,
  models: `CREATE TABLE models (
    id INTEGER PRIMARY KEY AUTOINCREMENT, created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    provider_id INTEGER NOT NULL, model_id TEXT NOT NULL, display_name TEXT NOT NULL,
    is_free INTEGER NOT NULL DEFAULT 0, intelligence_score REAL NOT NULL DEFAULT 0,
    speed_tier TEXT NOT NULL DEFAULT 'medium', input_cost_per_1m REAL NOT NULL DEFAULT 0,
    output_cost_per_1m REAL NOT NULL DEFAULT 0, context_window INTEGER,
    capabilities TEXT NOT NULL, stability_baseline REAL NOT NULL DEFAULT 0.9)`,
  userModels: `CREATE TABLE user_models (
    id INTEGER PRIMARY KEY AUTOINCREMENT, created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    created_by INTEGER, modified_by INTEGER, modified_at INTEGER,
    is_active INTEGER NOT NULL DEFAULT 1, is_deleted INTEGER NOT NULL DEFAULT 0,
    user_id INTEGER NOT NULL, provider_key_id INTEGER, model_id INTEGER, custom_provider_id INTEGER,
    enabled INTEGER NOT NULL DEFAULT 1, is_custom INTEGER NOT NULL DEFAULT 0, overrides TEXT)`,
  routingStrategies: `CREATE TABLE routing_strategies (
    id INTEGER PRIMARY KEY AUTOINCREMENT, created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    created_by INTEGER, modified_by INTEGER, modified_at INTEGER,
    is_active INTEGER NOT NULL DEFAULT 1, is_deleted INTEGER NOT NULL DEFAULT 0,
    user_id INTEGER NOT NULL, type TEXT NOT NULL, name TEXT NOT NULL,
    config TEXT NOT NULL DEFAULT '{}', is_default INTEGER NOT NULL DEFAULT 0)`,
  requestLogs: `CREATE TABLE request_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT, created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    user_id INTEGER NOT NULL, strategy_id INTEGER, provider_key_id INTEGER,
    requested_model TEXT NOT NULL,
    routed_provider TEXT, routed_model TEXT, fallback_attempts INTEGER NOT NULL DEFAULT 0,
    latency_ms INTEGER NOT NULL DEFAULT 0, input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0, cost_estimate REAL NOT NULL DEFAULT 0,
    cost_saved REAL NOT NULL DEFAULT 0, status TEXT NOT NULL)`,
};

const cannedResponse: ChatResponse = {
  id: 'chatcmpl-e2e',
  object: 'chat.completion',
  created: 0,
  model: 'llama-3.3-70b',
  choices: [
    { index: 0, message: { role: 'assistant', content: 'Hello!' }, finish_reason: 'stop' },
  ],
  usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
} as unknown as ChatResponse;

/**
 * Gateway chat e2e (TEST-013): proves the ScraperQ contract — `POST /v1/chat/completions` with an
 * `sqr-llm-` token returns an OpenAI-shaped body (no `{ data }` envelope) plus the routing telemetry
 * headers `X-Routed-Via` and, on fallback, `X-Fallback-Attempts`. The upstream call is stubbed by
 * overriding `AdapterRegistry`, so no real provider is hit.
 */
const chatCompletion = vi.fn();
const adapter = { chatCompletion } as unknown;
const registry = { get: () => adapter, has: () => true, keys: () => [] } as unknown as AdapterRegistry;

/** Seeds two providers (each a healthy key + one enabled free model) so failover has somewhere to go. */
async function seed(db: DatabaseService['db']): Promise<void> {
  for (const ddl of Object.values(DDL)) {
    await db.run(sql.raw(ddl));
  }
  const encryption = new EncryptionService();
  const cipher = encryption.encrypt('dummy-provider-key');
  await db.insert(apiTokens).values({ userId: 1, tokenHash: TOKEN_HASH, name: 'e2e', prefix: 'sqr-llm-chat' });
  for (const key of ['groq', 'cerebras']) {
    const provider = (
      await db
        .insert(providers)
        .values({ key, displayName: key, baseUrl: `https://${key}.test/v1`, adapterType: `${key}-test` })
        .returning()
    )[0]!;
    await db.insert(userProviderKeys).values({ userId: 1, providerId: provider.id, encryptedKey: cipher, status: 'healthy' });
    const model = (
      await db
        .insert(models)
        .values({ providerId: provider.id, modelId: `${key}-model`, displayName: `${key} model`, isFree: true, capabilities: CAPABILITIES })
        .returning()
    )[0]!;
    await db.insert(userModels).values({ userId: 1, modelId: model.id, enabled: true });
  }
}

/** Boots the app with a stubbed AdapterRegistry and seeds the gateway fixtures. */
async function boot(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(AdapterRegistry)
    .useValue(registry)
    .compile();
  const app = moduleRef.createNestApplication();
  applyGlobalConfig(app);
  await app.init();
  await seed(app.get(DatabaseService).db);
  return app;
}

describe('Gateway chat /v1/chat/completions (e2e, TEST-013)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await boot();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns an OpenAI-shaped response with X-Routed-Via and no envelope', async () => {
    chatCompletion.mockReset();
    chatCompletion.mockResolvedValue(cannedResponse);

    const response = await request(app.getHttpServer())
      .post('/v1/chat/completions')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ model: 'auto', messages: [{ role: 'user', content: 'hi' }] })
      .expect(200);

    // Raw OpenAI shape — NOT wrapped in { data }.
    expect(response.body.object).toBe('chat.completion');
    expect(response.body.choices[0].message.content).toBe('Hello!');
    expect(response.body.data).toBeUndefined();
    expect(response.headers['x-routed-via']).toMatch(/^(groq|cerebras)\/.+$/);
  });

  it('fails over before the first token and reports X-Fallback-Attempts', async () => {
    chatCompletion.mockReset();
    let calls = 0;
    chatCompletion.mockImplementation(() => {
      calls += 1;
      return calls === 1
        ? Promise.reject(new UpstreamError(429, 'rate limited'))
        : Promise.resolve(cannedResponse);
    });

    const response = await request(app.getHttpServer())
      .post('/v1/chat/completions')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ model: 'auto', messages: [{ role: 'user', content: 'hi' }] })
      .expect(200);

    expect(response.body.object).toBe('chat.completion');
    expect(response.headers['x-routed-via']).toMatch(/^(groq|cerebras)\/.+$/);
    expect(response.headers['x-fallback-attempts']).toBe('1');
  });

  it('rejects a request without an sqr-llm- token (401)', async () => {
    await request(app.getHttpServer())
      .post('/v1/chat/completions')
      .send({ model: 'auto', messages: [{ role: 'user', content: 'hi' }] })
      .expect(401);
  });
});
