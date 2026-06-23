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
  config({ path: envPath.length > 0 ? envPath : undefined });

  // Dynamic imports — these execute AFTER dotenv.config() so env vars are available
  const { NestFactory } = await import('@nestjs/core');
  const { AppModule } = await import('./app.module.js');
  const { applyGlobalConfig } = await import('./app.setup.js');
  const { setupSwagger } = await import('./common/swagger/setup-swagger.js');
  const { ConfigService } = await import('@nestjs/config');

  const app = await NestFactory.create(AppModule);
  applyGlobalConfig(app);
  setupSwagger(app);
  const configService = app.get<ConfigService>(ConfigService);
  await app.listen(configService.get('PORT'));
}

void bootstrap();
