import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { applyGlobalConfig } from '../src/app.setup.js';
import { setupSwagger } from '../src/common/swagger/setup-swagger.js';

/**
 * Verifies the OpenAPI documents are generated and served (TASK-009A / TEST-015): the management
 * spec declares the JWT security scheme and includes the health path; both docs are reachable.
 */
describe('Swagger docs (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Required env vars are provided by test/setup-env.ts before AppModule is imported.
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    applyGlobalConfig(app);
    setupSwagger(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves a valid management OpenAPI document at /api/docs-json', async () => {
    const response = await request(app.getHttpServer()).get('/api/docs-json');
    expect(response.status).toBe(200);
    expect(response.body.openapi).toMatch(/^3\./);
    expect(response.body.info.title).toBe('Free LLM Gateway Management API');
  });

  it('declares the JWT bearer security scheme on the management doc', async () => {
    const response = await request(app.getHttpServer()).get('/api/docs-json');
    expect(response.body.components.securitySchemes).toHaveProperty('jwt');
    expect(response.body.components.securitySchemes.jwt).toMatchObject({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    });
  });

  it('includes the health path in the management doc', async () => {
    const response = await request(app.getHttpServer()).get('/api/docs-json');
    // The global `api/v1` prefix is reflected in the documented path.
    expect(Object.keys(response.body.paths)).toContain('/api/v1/health');
  });

  it('serves the gateway OpenAPI document with the llm-token scheme', async () => {
    const response = await request(app.getHttpServer()).get('/v1/docs-json');
    expect(response.status).toBe(200);
    expect(response.body.info.title).toBe('Free LLM Gateway OpenAI-Compatible LLM API');
    expect(response.body.components.securitySchemes).toHaveProperty('llm-token');
  });
});
