import { Module } from '@nestjs/common';
import { RequestLogRepository } from './request-log.repository.js';
import { RequestLoggingService } from './request-logging.service.js';

/**
 * Usage logging + analytics (Phase 7). Owns the `request_logs` ledger and the cost-saved metric.
 * Exports {@link RequestLoggingService} so the gateway can log every `/v1` call.
 */
@Module({
  providers: [RequestLogRepository, RequestLoggingService],
  exports: [RequestLoggingService],
})
export class AnalyticsModule {}
