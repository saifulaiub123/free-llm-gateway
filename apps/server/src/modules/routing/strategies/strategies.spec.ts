import { describe, expect, it } from 'vitest';
import { FreeFirstStrategy } from './free-first.strategy.js';
import { FastestStrategy } from './fastest.strategy.js';
import { SmartStrategy } from './smart.strategy.js';
import { BalancedStrategy } from './balanced.strategy.js';
import { ManualStrategy } from './manual.strategy.js';
import type { RoutingCandidate, StrategyWeights } from '../types/routing-candidate.js';

/** Builds a candidate with sensible defaults; override the dimension under test. */
function candidate(modelId: number, overrides: Partial<RoutingCandidate> = {}): RoutingCandidate {
  return {
    userModelId: modelId,
    modelId,
    providerKey: 'groq',
    keyId: 1,
    isFree: true,
    costPer1m: 0,
    intelligenceScore: 50,
    measuredLatencyMs: 100,
    stability: 1,
    available: true,
    rateLimitHeadroom: 1,
    capabilities: { vision: false, tools: false, json: true },
    position: 0,
    ...overrides,
  };
}

const ids = (list: RoutingCandidate[]): number[] => list.map((candidate) => candidate.modelId);

/** All-weight-on-one-dimension presets for Balanced. */
function weightOn(dimension: keyof StrategyWeights): StrategyWeights {
  const base: StrategyWeights = {
    cost: 0,
    intelligence: 0,
    speed: 0,
    stability: 0,
    rateLimit: 0,
    availability: 0,
  };
  return { ...base, [dimension]: 1 };
}

describe('Routing strategies (TEST-003)', () => {
  it('FreeFirst: free before paid, cheapest free first', () => {
    const result = new FreeFirstStrategy().order([
      candidate(1, { isFree: false, costPer1m: 5 }),
      candidate(2, { isFree: true, costPer1m: 0 }),
      candidate(3, { isFree: false, costPer1m: 2 }),
    ]);
    expect(ids(result)).toEqual([2, 3, 1]);
  });

  it('Fastest: ascending measured latency', () => {
    const result = new FastestStrategy().order([
      candidate(1, { measuredLatencyMs: 300 }),
      candidate(2, { measuredLatencyMs: 100 }),
      candidate(3, { measuredLatencyMs: 200 }),
    ]);
    expect(ids(result)).toEqual([2, 3, 1]);
  });

  it('Smart: descending intelligence, free wins ties', () => {
    const result = new SmartStrategy().order([
      candidate(1, { intelligenceScore: 80, isFree: false }),
      candidate(2, { intelligenceScore: 90 }),
      candidate(3, { intelligenceScore: 80, isFree: true }),
    ]);
    expect(ids(result)).toEqual([2, 3, 1]);
  });

  it('Balanced: weight on cost picks cheapest; weight on intelligence picks smartest', () => {
    const candidates = [
      candidate(1, { isFree: false, costPer1m: 10, intelligenceScore: 95 }),
      candidate(2, { isFree: false, costPer1m: 1, intelligenceScore: 40 }),
    ];
    const byCost = new BalancedStrategy().order(candidates, { weights: weightOn('cost') });
    expect(ids(byCost)).toEqual([2, 1]);
    const byIntelligence = new BalancedStrategy().order(candidates, {
      weights: weightOn('intelligence'),
    });
    expect(ids(byIntelligence)).toEqual([1, 2]);
  });

  it('Manual.fixed honors saved position; metric sub-modes sort by that metric', () => {
    const manual = new ManualStrategy();
    const candidates = [
      candidate(1, { position: 2, stability: 0.5, costPer1m: 9, measuredLatencyMs: 300, rateLimitHeadroom: 0.2 }),
      candidate(2, { position: 0, stability: 0.9, costPer1m: 1, measuredLatencyMs: 100, rateLimitHeadroom: 0.9 }),
      candidate(3, { position: 1, stability: 0.7, costPer1m: 5, measuredLatencyMs: 200, rateLimitHeadroom: 0.5 }),
    ];
    expect(ids(manual.order(candidates, {}))).toEqual([2, 3, 1]); // fixed by position
    expect(ids(manual.order(candidates, { manualMode: 'stability' }))).toEqual([2, 3, 1]);
    expect(ids(manual.order(candidates, { manualMode: 'cost' }))).toEqual([2, 3, 1]);
    expect(ids(manual.order(candidates, { manualMode: 'latency' }))).toEqual([2, 3, 1]);
    expect(ids(manual.order(candidates, { manualMode: 'rate_limit' }))).toEqual([2, 3, 1]);
  });
});
