import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { sql } from 'drizzle-orm';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { applyGlobalConfig } from '../src/app.setup.js';
import { DatabaseService, users } from '../src/database/index.js';

const USERS_DDL = `CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT, created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  created_by INTEGER, modified_by INTEGER, modified_at INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1, is_deleted INTEGER NOT NULL DEFAULT 0,
  email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user'
)`;
const SETTINGS_DDL = `CREATE TABLE settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT, created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  scope TEXT NOT NULL, user_id INTEGER, key TEXT NOT NULL, value TEXT NOT NULL
)`;
const REFRESH_DDL = `CREATE TABLE refresh_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT, created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  user_id INTEGER NOT NULL, token_hash TEXT NOT NULL UNIQUE, family_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL, revoked_at INTEGER, replaced_by_token_id INTEGER,
  created_by_ip TEXT, user_agent TEXT
)`;

const USER_PASSWORD = 'user-password-123';

/** Boots the app and seeds one admin + one regular user (both with the same known password). */
async function boot(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  applyGlobalConfig(app);
  await app.init();
  const db = app.get(DatabaseService).db;
  for (const ddl of [USERS_DDL, SETTINGS_DDL, REFRESH_DDL]) {
    await db.run(sql.raw(ddl));
  }
  const passwordHash = await argon2.hash(USER_PASSWORD, { type: argon2.argon2id });
  await db.insert(users).values([
    { email: 'admin@example.com', passwordHash, role: 'admin' },
    { email: 'member@example.com', passwordHash, role: 'user' },
  ]);
  return app;
}

/**
 * Admin governance e2e (TEST-018): every `/api/v1/admin/*` route is admin-only (`403` for a user
 * JWT); an admin can update a global setting and a user's role/enabled flag; and a disabled user is
 * denied login.
 */
describe('Admin (e2e)', () => {
  let app: INestApplication;
  const jwt = new JwtService({});
  const sign = (sub: number, role: string): string =>
    jwt.sign({ sub, role }, { secret: process.env.JWT_ACCESS_SECRET as string });

  beforeAll(async () => {
    app = await boot();
  });

  afterAll(async () => {
    await app.close();
  });

  const authed = (path: string, sub: number, role: string) =>
    request(app.getHttpServer()).get(path).set('Authorization', `Bearer ${sign(sub, role)}`);

  it('rejects a non-admin on every admin route (403)', async () => {
    await authed('/api/v1/admin/users', 2, 'user').expect(403);
    await authed('/api/v1/admin/settings', 2, 'user').expect(403);
  });

  it('lists users for an admin without exposing password hashes', async () => {
    const response = await authed('/api/v1/admin/users', 1, 'admin').expect(200);
    const items = response.body.data.items as Record<string, unknown>[];
    expect(items).toHaveLength(2);
    expect(items.every((item) => !('passwordHash' in item))).toBe(true);
  });

  it('lets an admin update a global setting', async () => {
    await request(app.getHttpServer())
      .put('/api/v1/admin/settings/auth.registration_enabled')
      .set('Authorization', `Bearer ${sign(1, 'admin')}`)
      .send({ value: false })
      .expect(200);

    const status = await request(app.getHttpServer())
      .get('/api/v1/auth/registration-status')
      .expect(200);
    expect(status.body.data.registrationEnabled).toBe(false);
  });

  it('disables a user, who can then no longer log in', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/admin/users/2')
      .set('Authorization', `Bearer ${sign(1, 'admin')}`)
      .send({ isActive: false })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'member@example.com', password: USER_PASSWORD })
      .expect(401);
  });

  it('refuses to disable the last remaining admin', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/admin/users/1')
      .set('Authorization', `Bearer ${sign(1, 'admin')}`)
      .send({ isActive: false })
      .expect(400);
  });
});
