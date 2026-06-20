import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.schema.js';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { TokensModule } from './modules/tokens/tokens.module.js';
import { StaticModule } from './static/static.module.js';

/**
 * Root application module.
 *
 * Wires global configuration validation (fail-fast via {@link validateEnv}), the database provider,
 * static client serving (production only), and feature modules. Feature modules are added here as
 * later phases introduce them.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Load the server-local .env first, then fall back to the monorepo root .env. Existing
      // process.env always wins (so Docker/CI env and tests are authoritative).
      envFilePath: ['.env', '../../.env'],
      validate: validateEnv,
    }),
    DatabaseModule,
    StaticModule.register(),
    AuthModule,
    TokensModule,
    HealthModule,
  ],
})
export class AppModule {}
