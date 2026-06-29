import { Injectable, Logger } from '@nestjs/common';
import { AppLogRepository } from './app-log.repository.js';

/** Structured context for an app-log entry. */
export interface AppLogContext {
  statusCode?: number;
  method?: string;
  url?: string;
  userId?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Persists application-level errors (4xx / 5xx) to the `app_logs` table.
 *
 * WHY a dedicated service: operators need to query production errors in the database alongside
 * the analytics data for a single-pane-of-glass debugging experience. The Pino logger still
 * writes to stdout (docker logs / log aggregator); this service **additionally** persists a
 * structured summary to PostgreSQL so error dashboards and alerting queries work without an
 * external log-aggregation service.
 */
@Injectable()
export class AppLogService {
  private readonly logger = new Logger(AppLogService.name);

  constructor(private readonly repository: AppLogRepository) {}

  /**
   * Records an app-log entry asynchronously.
   *
   * WHY this swallows errors: persistence failures must never cascade into the request-response
   * path. If the DB write fails (e.g. connection issue), we fall back to a Pino `warn` log and
   * move on — the primary exception handling is unaffected.
   */
  async log(
    level: 'error' | 'warn',
    message: string,
    stack?: string,
    context?: AppLogContext,
  ): Promise<void> {
    try {
      await this.repository.write({
        level,
        message,
        stack: stack ?? null,
        statusCode: context?.statusCode ?? null,
        method: context?.method ?? null,
        url: context?.url ?? null,
        userId: context?.userId ?? null,
        metadata: context?.metadata ? JSON.stringify(context.metadata) : null,
      });
    } catch (err) {
      this.logger.warn('Failed to persist app log entry', err instanceof Error ? err.message : err);
    }
  }
}
