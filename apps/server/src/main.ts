import 'reflect-metadata';
import { existsSync } from 'fs';
import { config } from 'dotenv';

/**
 * Loads `.env` before ANY NestJS module is imported.
 *
 * WHY dynamic import: the schema modules (e.g. `refresh-tokens.ts`) call `getActiveProvider()` at
 * MODULE-LOAD time (top-level `const { columnKit } = getActiveProvider()`). Since static `import`
 * declarations are hoisted, the schemas are evaluated before any code in this file runs — and at
 * that point `ConfigModule.forRoot()` hasn't loaded `.env` yet. Without env vars, the provider
 * defaults to `sqlite`, giving SQLite column types at runtime even when `DB_PROVIDER=postgres`.
 * Dynamic `import()` defers the module graph load until AFTER `dotenv.config()` has populated
 * `process.env`, so `getActiveProvider()` sees the correct `DB_PROVIDER` value.
 *
 * See: `apps/server/src/database/providers/registry.ts` → `resolveProvider()`
 */
async function bootstrap(): Promise<void> {
  // Load dotenv BEFORE any dynamic imports of NestJS modules
  const envPath: string[] = [];
  if (existsSync('.env')) envPath.push('.env');
  if (existsSync('../../.env')) envPath.push('../../.env');
  if (envPath.length > 0) {
    config({ path: envPath });
  } else {
    config();
  }

  // Dynamic imports — these execute AFTER dotenv.config() so env vars are available
  const { NestFactory } = await import('@nestjs/core');
  const { AppModule } = await import('./app.module.js');
  const { applyGlobalConfig } = await import('./app.setup.js');
  const { setupSwagger } = await import('./common/swagger/setup-swagger.js');
  const { ConfigService } = await import('@nestjs/config');
  const { default: express } = await import('express');

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  applyGlobalConfig(app);

  // Replace the default NestJS logger with Pino (buffered boot logs are flushed now).
  const { Logger } = await import('nestjs-pino');
  app.useLogger(app.get(Logger));

  // Read MAX_BODY_SIZE from config (default 1mb) and apply it to the JSON body parser.
  // WHY: chat-completion payloads can be large (hundreds of KB). The Express default of
  // 100 KB causes PayloadTooLargeError. Making it configurable per deployment avoids both
  // DoS risk (unbounded) and breakage (too small).
  const configService = app.get<InstanceType<typeof ConfigService>>(ConfigService);
  const maxBodySize = configService.get('MAX_BODY_SIZE', '1mb');
  app.use(express.json({ limit: maxBodySize }));

  setupSwagger(app);
  await app.listen(configService.get('PORT', 3000));
}

void bootstrap();
