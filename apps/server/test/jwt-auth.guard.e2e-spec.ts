import 'reflect-metadata';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { Controller, Get, type INestApplication, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { applyGlobalConfig } from '../src/app.setup.js';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard.js';

/**
 * Throwaway protected route used to exercise {@link JwtAuthGuard} in isolation (TASK-013), since the
 * first real guarded endpoint (`/api/v1/tokens`) arrives with TASK-014.
 */
@Controller('guarded')
@UseGuards(JwtAuthGuard)
class GuardedTestController {
  @Get()
  ping(): { ok: true } {
    return { ok: true };
  }
}

/** Verifies the JWT guard rejects unauthenticated requests and admits valid access tokens. */
describe('JwtAuthGuard (e2e)', () => {
  let app: INestApplication;
  const jwt = new JwtService({});

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [GuardedTestController],
    }).compile();
    app = moduleRef.createNestApplication();
    applyGlobalConfig(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects a request with no JWT (401)', async () => {
    await request(app.getHttpServer()).get('/api/v1/guarded').expect(401);
  });

  it('rejects a malformed/invalid bearer token (401)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/guarded')
      .set('Authorization', 'Bearer not-a-real-jwt')
      .expect(401);
  });

  it('admits a request carrying a valid access JWT (200)', async () => {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) throw new Error('JWT_ACCESS_SECRET must be set in the test env');
    const token = await jwt.signAsync({ sub: 1, role: 'user' }, { secret });
    await request(app.getHttpServer())
      .get('/api/v1/guarded')
      .set('Authorization', `Bearer ${token}`)
      .expect(200, { data: { ok: true } });
  });
});
