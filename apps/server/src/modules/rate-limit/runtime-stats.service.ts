import { Injectable } from '@nestjs/common';

/** Rolling aggregate of a `(user, model)` pair's recent behavior. */
interface StatsEntry {
  successCount: number;
  failureCount: number;
  avgLatencyMs: number;
  attempts: number;
  lastSuccessAt: number | null;
}

/**
 * Records the outcome of each routing attempt and exposes the live aggregates (TASK-038).
 *
 * WHY in-memory aggregates: the auto-strategies read stability (success rate) and speed (avg latency)
 * while ordering candidates on the hot path. `model_runtime_stats` is the durable backing store.
 */
@Injectable()
export class RuntimeStatsService {
  private readonly stats = new Map<string, StatsEntry>();

  /** Updates the rolling success/failure counts and the rolling mean latency for a model. */
  recordOutcome(userId: number, modelId: number, success: boolean, latencyMs: number): void {
    const key = this.statsKey(userId, modelId);
    const entry =
      this.stats.get(key) ??
      ({ successCount: 0, failureCount: 0, avgLatencyMs: 0, attempts: 0, lastSuccessAt: null } satisfies StatsEntry);

    if (success) {
      entry.successCount += 1;
      entry.lastSuccessAt = Date.now();
    } else {
      entry.failureCount += 1;
    }
    // Incremental rolling mean over all attempts.
    entry.avgLatencyMs = (entry.avgLatencyMs * entry.attempts + latencyMs) / (entry.attempts + 1);
    entry.attempts += 1;
    this.stats.set(key, entry);
  }

  /**
   * Stability as success rate in `[0, 1]`. WHY optimistic default: an unseen model returns `1` so a
   * freshly discovered model is not penalized before it has any history.
   */
  stabilityOf(userId: number, modelId: number): number {
    const entry = this.stats.get(this.statsKey(userId, modelId));
    if (!entry || entry.attempts === 0) {
      return 1;
    }
    return entry.successCount / entry.attempts;
  }

  /** Rolling average latency in ms for a model (0 when unseen). */
  avgLatencyOf(userId: number, modelId: number): number {
    return this.stats.get(this.statsKey(userId, modelId))?.avgLatencyMs ?? 0;
  }

  /** Stable key for a `(user, model)` aggregate. */
  private statsKey(userId: number, modelId: number): string {
    return `${userId}|${modelId}`;
  }
}
