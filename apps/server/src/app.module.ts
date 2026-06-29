import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { validateEnv } from './config/env.schema.js';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { ProvidersModule } from './modules/providers/providers.module.js';
import { ModelsModule } from './modules/models/models.module.js';
import { RateLimitModule } from './modules/rate-limit/rate-limit.module.js';
import { RoutingModule } from './modules/routing/routing.module.js';
import { SettingsModule } from './modules/settings/settings.module.js';
import { AdminModule } from './modules/admin/admin.module.js';
import { AnalyticsModule } from './modules/analytics/analytics.module.js';
import { GatewayModule } from './modules/gateway/gateway.module.js';
import { TokensModule } from './modules/tokens/tokens.module.js';
import { PinoLoggerModule } from './common/logger/logger.module.js';
import { StaticModule } from './static/static.module.js';
import { AppLogModule } from './modules/app-log/app-log.module.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';

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
    ScheduleModule.forRoot(),
    PinoLoggerModule,
    DatabaseModule,
    StaticModule.register(),
    AuthModule,
    TokensModule,
    ProvidersModule,
    ModelsModule,
    RateLimitModule,
    RoutingModule,
    SettingsModule,
    AdminModule,
    AnalyticsModule,
    GatewayModule,
    HealthModule,
    AppLogModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
