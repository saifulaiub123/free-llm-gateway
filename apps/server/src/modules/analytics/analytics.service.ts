import { BadRequestException, Injectable } from '@nestjs/common';
import {
  RequestLogRepository,
  type LogPage,
  type ProviderUsageRow,
} from './request-log.repository.js';

/** Supported analytics windows mapped to their span in milliseconds. */
const WINDOW_MS: Record<string, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

const DEFAULT_WINDOW = '24h';
const DEFAULT_PAGE_LIMIT = 50;
const MAX_PAGE_LIMIT = 200;

/** The headline usage summary returned to the dashboard for a window. */
export interface UsageSummary {
  window: string;
  requests: number;
  successRate: number;
  avgLatencyMs: number;
  totalTokens: number;
  totalCostSaved: number;
}

/**
 * Read model over the `request_logs` ledger (TASK-056): turns raw rows into the dashboard's
 * volume/success/latency/tokens/cost-saved summary, the per-provider breakdown, and paginated logs.
 * Every query is scoped to the calling user (SEC-004).
 */
@Injectable()
export class AnalyticsService {
  constructor(private readonly repository: RequestLogRepository) {}

  /** Volume, success rate, latency, tokens, and total cost saved for the caller over a window. */
  async summary(userId: number, window?: string): Promise<UsageSummary> {
    const resolved = this.resolveWindow(window);
    const totals = await this.repository.summary(userId, this.since(resolved));
    return {
      window: resolved,
      requests: totals.requests,
      successRate: totals.requests > 0 ? totals.successes / totals.requests : 0,
      avgLatencyMs: totals.avgLatencyMs,
      totalTokens: totals.totalTokens,
      totalCostSaved: totals.totalCostSaved,
    };
  }

  /** Per-provider usage breakdown for the caller over a window. */
  async byProvider(userId: number, window?: string): Promise<ProviderUsageRow[]> {
    const resolved = this.resolveWindow(window);
    return this.repository.byProvider(userId, this.since(resolved));
  }

  /** One page of the caller's logs (keyset pagination, newest-first). */
  async listLogs(userId: number, cursor?: number, limit?: number): Promise<LogPage> {
    return this.repository.page(userId, this.resolveLimit(limit), cursor);
  }

  /** Validates the requested window, defaulting to 24h. */
  private resolveWindow(window?: string): string {
    if (window === undefined) {
      return DEFAULT_WINDOW;
    }
    if (!(window in WINDOW_MS)) {
      throw new BadRequestException(`window must be one of ${Object.keys(WINDOW_MS).join(', ')}`);
    }
    return window;
  }

  /** Clamps the page size into `[1, MAX_PAGE_LIMIT]`. */
  private resolveLimit(limit?: number): number {
    if (limit === undefined || Number.isNaN(limit) || limit < 1) {
      return DEFAULT_PAGE_LIMIT;
    }
    return Math.min(limit, MAX_PAGE_LIMIT);
  }

  /** The lower-bound timestamp for a validated window. */
  private since(window: string): Date {
    return new Date(Date.now() - (WINDOW_MS[window] ?? WINDOW_MS[DEFAULT_WINDOW]!));
  }
}
