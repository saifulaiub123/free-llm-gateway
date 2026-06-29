import { Module } from '@nestjs/common';
import { AppLogService } from './app-log.service.js';
import { AppLogRepository } from './app-log.repository.js';

/**
 * Operational error logging — persists 4xx / 5xx errors to the `app_logs` table.
 *
 * WHY a module: `AllExceptionsFilter` needs DI access to `AppLogService` to persist errors at
 * the catch boundary. Registering it here and exporting the service lets the filter (wired via
 * `APP_FILTER` in `AppModule`) inject it cleanly.
 */
@Module({
  providers: [AppLogService, AppLogRepository],
  exports: [AppLogService],
})
export class AppLogModule {}
