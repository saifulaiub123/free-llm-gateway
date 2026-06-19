import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { sql } from 'drizzle-orm';
import request from 'supertest';
import type { DbExecutor } from '@gateway/db';
import { AppModule } from '../src/app.module.js';
import { applyGlobalConfig } from '../src/app.setup.js';
import { DB } from '../src/database/database.module.js';

// DDL for the identity tables (mirrors migrations/sqlite/0000_*), applied to the app's :memory: db.
const USERS_DDL = `CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  created_by INTEGER, modified_by INTEGER, modified_at INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1, is_deleted INTEGER NOT NULL DEFAULT 0,
  email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user'
)`;
const REFRESH_DDL = `CREATE TABLE refresh_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  user_id INTEGER NOT NULL, token_hash TEXT NOT NULL UNIQUE, family_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL, revoked_at INTEGER, replaced_by_token_id INTEGER,
  created_by_ip TEXT, user_agent TEXT
)`;

/** Boots the full app with production global config and creates the identity tables on its db. */
async function bootstrapApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  applyGlobalConfig(app);
  await app.init();
  const db = app.get<DbExecutor>(DB);
  db.run(sql.raw(USERS_DDL));
  db.run(sql.raw(REFRESH_DDL));
  return app;
}

/** Posts to an `/api/v1/auth/<action>` endpoint. */
const authPost = (app: INestApplication, action: string, body: object) =>
  request(app.getHttpServer()).post(`/api/v1/auth/${action}`).send(body);

/**
 * End-to-end auth flow over HTTP against the real app + in-memory SQLite: register → login → refresh,
 * refresh-token replay rejection (TEST-014), duplicate/invalid handling, and logout.
 */
describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await bootstrapApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers, logs in, refreshes, and rejects a replayed refresh token', async () => {
    const registered = await authPost(app, 'register', { email: 'flow@example.com', password: 'password123' }).expect(201);
    expect(registered.body.data.accessToken).toEqual(expect.any(String));
    const firstRefresh = registered.body.data.refreshToken as string;

    await authPost(app, 'login', { email: 'flow@example.com', password: 'password123' }).expect(200);

    const refreshed = await authPost(app, 'refresh', { refreshToken: firstRefresh }).expect(200);
    expect(refreshed.body.data.refreshToken).not.toBe(firstRefresh);

    // Replaying the now-rotated token is rejected (reuse detection, TEST-014).
    await authPost(app, 'refresh', { refreshToken: firstRefresh }).expect(401);
  });

  it('rejects duplicate registration, invalid credentials, and invalid input', async () => {
    await authPost(app, 'register', { email: 'dup@example.com', password: 'password123' }).expect(201);
    await authPost(app, 'register', { email: 'dup@example.com', password: 'password123' }).expect(409);
    await authPost(app, 'login', { email: 'dup@example.com', password: 'wrong-password' }).expect(401);
    await authPost(app, 'register', { email: 'not-an-email', password: 'short' }).expect(400);
  });

  it('logs out by revoking the refresh token', async () => {
    const registered = await authPost(app, 'register', { email: 'logout@example.com', password: 'password123' }).expect(201);
    const refreshToken = registered.body.data.refreshToken as string;

    await authPost(app, 'logout', { refreshToken }).expect(200);
    // After logout the token is revoked, so refresh is rejected.
    await authPost(app, 'refresh', { refreshToken }).expect(401);
  });
});
