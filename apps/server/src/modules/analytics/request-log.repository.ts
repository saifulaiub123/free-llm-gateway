import { Injectable } from '@nestjs/common';
import { and, desc, eq, getTableColumns, gte, lt, sql } from 'drizzle-orm';
import { requestLogs, models, DatabaseService } from '../../database/index.js';
import { BaseRepository } from '../../common/db/base.repository.js';

/** Aggregated usage totals over a time window (basis for the analytics summary). */
export interface UsageSummaryRow {
  requests: number;
  successes: number;
  avgLatencyMs: number;
  totalTokens: number;
  totalCostSaved: number;
}

/** Per-provider usage totals over a time window. */
export interface ProviderUsageRow {
  provider: string | null;
  requests: number;
  successes: number;
  avgLatencyMs: number;
  totalCostSaved: number;
}

/** A request-log row extended with the resolved display name from the models catalog. */
export interface LogItem extends Omit<typeof requestLogs.$inferSelect, 'routedModel'> {
  routedModel: string | null;
  routedModelDisplay: string | null;
}

/** One page of request logs plus the cursor to fetch the next page. */
export interface LogPage {
  items: LogItem[];
  nextCursor: number | null;
}

/** Persistence for the append-only `request_logs` ledger (one row per `/v1` call). */
@Injectable()
export class RequestLogRepository extends BaseRepository<typeof requestLogs> {
  constructor(database: DatabaseService) {
    super(database, requestLogs, false); // append-only ledger composes baseColumns only
  }

  /** Aggregates the caller's rows since `since` into volume/success/latency/tokens/cost-saved totals. */
  async summary(userId: number, since: Date): Promise<UsageSummaryRow> {
    const rows = await this.exec()
      .select({
        requests: sql<number>`count(*)`,
        successes: sql<number>`sum(case when ${requestLogs.status} = 'success' then 1 else 0 end)`,
        avgLatencyMs: sql<number>`coalesce(avg(${requestLogs.latencyMs}), 0)`,
        totalTokens: sql<number>`coalesce(sum(${requestLogs.inputTokens} + ${requestLogs.outputTokens}), 0)`,
        totalCostSaved: sql<number>`coalesce(sum(${requestLogs.costSaved}), 0)`,
      })
      .from(requestLogs)
      .where(and(eq(requestLogs.userId, userId), gte(requestLogs.createdAt, since)));
    return this.toSummary(rows[0]);
  }

  /** Per-provider breakdown of the caller's rows since `since`, busiest provider first. */
  async byProvider(userId: number, since: Date): Promise<ProviderUsageRow[]> {
    const rows = await this.exec()
      .select({
        provider: requestLogs.routedProvider,
        requests: sql<number>`count(*)`,
        successes: sql<number>`sum(case when ${requestLogs.status} = 'success' then 1 else 0 end)`,
        avgLatencyMs: sql<number>`coalesce(avg(${requestLogs.latencyMs}), 0)`,
        totalCostSaved: sql<number>`coalesce(sum(${requestLogs.costSaved}), 0)`,
      })
      .from(requestLogs)
      .where(and(eq(requestLogs.userId, userId), gte(requestLogs.createdAt, since)))
      .groupBy(requestLogs.routedProvider)
      .orderBy(desc(sql`count(*)`));
    return rows.map((row) => ({
      provider: row.provider,
      requests: Number(row.requests),
      successes: Number(row.successes ?? 0),
      avgLatencyMs: Number(row.avgLatencyMs),
      totalCostSaved: Number(row.totalCostSaved),
    }));
  }

  /**
   * Returns one page of the caller's logs newest-first using keyset pagination on the descending id.
   *
   * WHY keyset (`id < cursor`) over OFFSET: the ledger only grows, so a stable cursor avoids skipped
   * or duplicated rows as new logs arrive between page fetches.
   */
  async page(userId: number, limit: number, cursor?: number): Promise<LogPage> {
    const predicate = cursor
      ? and(eq(requestLogs.userId, userId), lt(requestLogs.id, cursor))
      : eq(requestLogs.userId, userId);
    const rows = await this.exec()
      .select({
        ...getTableColumns(requestLogs),
        routedModelDisplay: models.displayName,
      })
      .from(requestLogs)
      .leftJoin(models, eq(requestLogs.routedModel, models.modelId))
      .where(predicate)
      .orderBy(desc(requestLogs.id))
      .limit(limit + 1); // fetch one extra to detect a next page
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null;
    return { items, nextCursor };
  }

  /** Hard-deletes logs older than `cutoff` (retention pruning). */
  async pruneOlderThan(cutoff: Date): Promise<void> {
    await this.exec().delete(requestLogs).where(lt(requestLogs.createdAt, cutoff));
  }

  /** Coerces raw aggregate values (the driver may return strings/bigints) into a typed summary. */
  private toSummary(row: UsageSummaryRow | undefined): UsageSummaryRow {
    return {
      requests: Number(row?.requests ?? 0),
      successes: Number(row?.successes ?? 0),
      avgLatencyMs: Number(row?.avgLatencyMs ?? 0),
      totalTokens: Number(row?.totalTokens ?? 0),
      totalCostSaved: Number(row?.totalCostSaved ?? 0),
    };
  }
}
