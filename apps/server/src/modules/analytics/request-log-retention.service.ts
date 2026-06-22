import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { RequestLogRepository } from './request-log.repository.js';

/** How long request logs are retained before pruning (config, default 90 days). */
const RETENTION_DAYS = Number(process.env.REQUEST_LOG_RETENTION_DAYS ?? 90);

/** How often the prune job runs (once per day). */
const PRUNE_INTERVAL_MS = 24 * 60 * 60 * 1000;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Prunes `request_logs` rows older than `REQUEST_LOG_RETENTION_DAYS` on a daily schedule (TASK-056).
 *
 * WHY a TTL job (not soft delete): the ledger is high-volume and append-only, so old rows are removed
 * outright to bound table growth; analytics only ever query recent windows.
 */
@Injectable()
export class RequestLogRetentionService {
  private readonly logger = new Logger(RequestLogRetentionService.name);

  constructor(private readonly repository: RequestLogRepository) {}

  @Interval(PRUNE_INTERVAL_MS)
  async prune(): Promise<void> {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * MS_PER_DAY);
    try {
      await this.repository.pruneOlderThan(cutoff);
      this.logger.log(`Pruned request logs older than ${cutoff.toISOString()}.`);
    } catch (error) {
      // WHY swallow: retention is housekeeping; a failed prune must never crash the app.
      this.logger.warn(`Failed to prune request logs: ${String(error)}`);
    }
  }
}
