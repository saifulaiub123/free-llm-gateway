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
import { DatabaseService, apiTokens } from '../src/database/index.js';

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

const TOKEN = 'sqr-llm-gateway-e2e-secret';
const TOKEN_HASH = createHash('sha256').update(TOKEN).digest('hex');

/**
 * Guard separation (TEST-008): the `/v1` gateway accepts ONLY `sqr-llm-` tokens and rejects JWTs, and
 * its responses bypass the `{ data }` envelope (CON-003).
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
    await db.run(sql.raw(API_TOKENS_DDL));
    await db.insert(apiTokens).values({ userId: 1, tokenHash: TOKEN_HASH, name: 'e2e', prefix: 'sqr-llm-gate' });
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

  it('accepts a valid LLM API token and returns a raw OpenAI list (no envelope)', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/models')
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);
    expect(response.body).toEqual({ object: 'list', data: [] }); // not wrapped in { data }
  });
});
