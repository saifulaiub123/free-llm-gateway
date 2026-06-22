import { Module } from '@nestjs/common';
import { RequestLogRepository } from './request-log.repository.js';
import { RequestLoggingService } from './request-logging.service.js';
import { RequestLogRetentionService } from './request-log-retention.service.js';
import { AnalyticsService } from './analytics.service.js';
import { AnalyticsController, LogsController } from './analytics.controller.js';

/**
 * Usage logging + analytics (Phase 7). Owns the `request_logs` ledger and the cost-saved metric:
 * exposes the JWT-guarded `/api/v1/analytics` + `/api/v1/logs` read endpoints, prunes old rows on a
 * schedule, and exports {@link RequestLoggingService} so the gateway can log every `/v1` call.
 */
@Module({
  controllers: [AnalyticsController, LogsController],
  providers: [
    RequestLogRepository,
    RequestLoggingService,
    RequestLogRetentionService,
    AnalyticsService,
  ],
  exports: [RequestLoggingService],
})
export class AnalyticsModule {}
