import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';

/**
 * Configures Pino as the NestJS application logger (structured JSON output to stdout).
 *
 * WHY nestjs-pino: it is the standard structured-logging bridge for NestJS (~1.4k GitHub stars).
 * It automatically replaces NestJS's built-in `Logger` so every existing `new Logger(Name.name)`
 * call routes through Pino with zero migration — no service file needs changing.
 *
 * Log level is driven by the `LOG_LEVEL` environment variable (default `error`). In development
 * (`NODE_ENV !== 'production'`) the `pino-pretty` transport is enabled for human-readable colored
 * output; in production raw NDJSON is emitted so log aggregators (Datadog, Loki, ELK, etc.) can
 * consume it natively.
 *
 * `autoLogging: false` disables pino-http automatic request/response logging — the gateway already
 * writes request analytics to the database, and we default to `error`-only output. Request logging
 * can be enabled later with a separate env var if needed.
 */
@Module({
  imports: [
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isDev = process.env.NODE_ENV !== 'production';
        return {
          pinoHttp: {
            level: config.get<string>('LOG_LEVEL', 'error'),
            // pino-pretty for human-readable output in dev; NDJSON in production.
            ...(isDev ? { transport: { target: 'pino-pretty', options: { colorize: true } } } : {}),
          },
          autoLogging: false,
        };
      },
    }),
  ],
})
export class PinoLoggerModule {}
