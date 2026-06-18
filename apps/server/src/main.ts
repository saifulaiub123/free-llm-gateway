import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import { applyGlobalConfig } from './app.setup.js';
import { setupSwagger } from './common/swagger/setup-swagger.js';
import type { Env } from './config/env.schema.js';

/**
 * Boots the HTTP server: creates the Nest app, applies shared global config, and listens on the
 * validated `PORT`. Environment is validated during module init, so a misconfigured env aborts boot.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  applyGlobalConfig(app);
  setupSwagger(app);
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  await app.listen(config.get('PORT', { infer: true }));
}

void bootstrap();
