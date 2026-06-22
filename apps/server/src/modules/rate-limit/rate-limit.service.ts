import { Injectable } from '@nestjs/common';
import { WINDOW_MS, type CounterScope, type RateCaps, type RateWindow } from './types.js';

/** A single window's running count and when its window started. */
interface CounterEntry {
  count: number;
  windowStart: number;
}

/**
 * Tracks RPM/RPD/TPM/TPD usage with an in-memory hot cache (TASK-036).
 *
 * WHY a hot cache: the router checks headroom on every request, so hitting the DB each time would add
 * latency to the hot path. Counters live in memory here; the `rate_limit_counters` table is the
 * durable backing store (flush/hydrate is wired when the gateway records usage, Phase 6). Windows
 * roll over lazily on read/write, and `windowRollover()` can sweep them on a schedule.
 */
@Injectable()
export class RateLimitService {
  private readonly counters = new Map<string, CounterEntry>();

  /** True only if every capped window still has remaining headroom. */
  hasHeadroom(scope: CounterScope, caps: RateCaps): boolean {
    return (Object.entries(caps) as [RateWindow, number | undefined][]).every(
      ([window, cap]) => cap === undefined || this.currentCount(scope, window) < cap,
    );
  }

  /** Records one request (+1 rpm/rpd) and its token usage (+tokens tpm/tpd). */
  recordUsage(scope: CounterScope, tokens: number): void {
    this.increment(scope, 'rpm', 1);
    this.increment(scope, 'rpd', 1);
    this.increment(scope, 'tpm', tokens);
    this.increment(scope, 'tpd', tokens);
  }

  /** Resets every window whose duration has elapsed (sweep; reads also roll over lazily). */
  windowRollover(now: number = Date.now()): void {
    for (const [key, entry] of this.counters) {
      const window = key.slice(key.lastIndexOf('|') + 1) as RateWindow;
      if (now - entry.windowStart >= WINDOW_MS[window]) {
        entry.count = 0;
        entry.windowStart = now;
      }
    }
  }

  /** Current count for a window, lazily resetting it if the window has elapsed. */
  private currentCount(scope: CounterScope, window: RateWindow): number {
    const entry = this.counters.get(this.cacheKey(scope, window));
    if (!entry) {
      return 0;
    }
    if (Date.now() - entry.windowStart >= WINDOW_MS[window]) {
      entry.count = 0;
      entry.windowStart = Date.now();
    }
    return entry.count;
  }

  /** Adds `by` to a window's count, starting a fresh window if absent or elapsed. */
  private increment(scope: CounterScope, window: RateWindow, by: number): void {
    const key = this.cacheKey(scope, window);
    const entry = this.counters.get(key);
    const now = Date.now();
    if (!entry || now - entry.windowStart >= WINDOW_MS[window]) {
      this.counters.set(key, { count: by, windowStart: now });
      return;
    }
    entry.count += by;
  }

  /** Stable cache key for a scope + window. */
  private cacheKey(scope: CounterScope, window: RateWindow): string {
    return `${scope.userId}|${scope.keyId}|${scope.modelId}|${window}`;
  }
}
