import { describe, expect, it } from 'vitest';
import { RuntimeStatsService } from './runtime-stats.service.js';

describe('RuntimeStatsService', () => {
  it('computes stability as the success rate (9 successes + 1 failure ≈ 0.9)', () => {
    const service = new RuntimeStatsService();
    for (let i = 0; i < 9; i += 1) {
      service.recordOutcome(1, 2, true, 100);
    }
    service.recordOutcome(1, 2, false, 100);
    expect(service.stabilityOf(1, 2)).toBeCloseTo(0.9);
  });

  it('updates average latency as a rolling mean', () => {
    const service = new RuntimeStatsService();
    service.recordOutcome(1, 2, true, 100);
    service.recordOutcome(1, 2, true, 100);
    service.recordOutcome(1, 2, true, 200);
    expect(service.avgLatencyOf(1, 2)).toBeCloseTo((100 + 100 + 200) / 3);
  });

  it('returns an optimistic stability of 1 for an unseen model', () => {
    const service = new RuntimeStatsService();
    expect(service.stabilityOf(9, 9)).toBe(1);
    expect(service.avgLatencyOf(9, 9)).toBe(0);
  });
});
