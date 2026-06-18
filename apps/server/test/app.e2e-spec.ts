import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { applyGlobalConfig } from '../src/app.setup.js';

/**
 * Boots the full Nest application (with the same global config as production) and verifies the
 * health endpoint resolves under the `api/v1` prefix and is wrapped by the response envelope.
 */
describe('App (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Required env vars are provided by test/setup-env.ts before AppModule is imported.
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    applyGlobalConfig(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health returns 200 with the response envelope', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: { status: 'ok' } });
  });

  it('returns 404 for an unknown route under the prefix', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/does-not-exist');
    expect(response.status).toBe(404);
  });
});
