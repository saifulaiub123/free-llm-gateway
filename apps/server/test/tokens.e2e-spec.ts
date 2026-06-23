import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { sql } from 'drizzle-orm';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { applyGlobalConfig } from '../src/app.setup.js';
import { DatabaseService } from '../src/database/index.js';

// DDL for api_tokens (mirrors migrations/sqlite), applied to the app's :memory: db.
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

/**
 * End-to-end token management over HTTP against the real app + in-memory SQLite: create (plaintext
 * shown once), list (metadata only, never the hash), owner-scoped revoke (SEC-004), and auth gating.
 */
describe('Tokens (e2e)', () => {
  let app: INestApplication;
  const jwt = new JwtService({});
  const bearer = (sub: number): string =>
    jwt.sign({ sub, role: 'user' }, { secret: process.env.JWT_ACCESS_SECRET as string });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    applyGlobalConfig(app);
    await app.init();
    await app.get(DatabaseService).db.run(sql.raw(API_TOKENS_DDL));
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates once, lists metadata without the hash, and scopes revoke by owner', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/tokens')
      .set('Authorization', `Bearer ${bearer(1)}`)
      .send({ name: 'ci' })
      .expect(201);
    const { token, prefix } = created.body.data;
    expect(token).toMatch(/^sqr-llm-/);
    expect(prefix).toBe(token.slice(0, 12));

    const listed = await request(app.getHttpServer())
      .get('/api/v1/tokens')
      .set('Authorization', `Bearer ${bearer(1)}`)
      .expect(200);
    expect(listed.body.data).toHaveLength(1);
    const row = listed.body.data[0];
    expect(row).toMatchObject({ name: 'ci', prefix, revoked: false });
    expect(row).not.toHaveProperty('tokenHash');
    expect(row).not.toHaveProperty('token_hash');

    // Another user cannot revoke it (SEC-004): 0 rows affected.
    const otherRevoke = await request(app.getHttpServer())
      .delete(`/api/v1/tokens/${row.id}`)
      .set('Authorization', `Bearer ${bearer(2)}`)
      .expect(200);
    expect(otherRevoke.body.data).toEqual({ revoked: false });

    // The owner can.
    const ownerRevoke = await request(app.getHttpServer())
      .delete(`/api/v1/tokens/${row.id}`)
      .set('Authorization', `Bearer ${bearer(1)}`)
      .expect(200);
    expect(ownerRevoke.body.data).toEqual({ revoked: true });
  });

  it('rejects unauthenticated requests (401)', async () => {
    await request(app.getHttpServer()).get('/api/v1/tokens').expect(401);
  });
});
