import { describe, expect, it } from 'vitest';
import { ChainFilter } from './chain-filter.js';
import type { RoutingCandidate } from './types/routing-candidate.js';

/** Builds a baseline eligible candidate; override fields per assertion. */
function makeCandidate(overrides: Partial<RoutingCandidate> = {}): RoutingCandidate {
  return {
    userModelId: 1,
    modelId: 1,
    upstreamModelId: 'model-1',
    providerKey: 'groq',
    keyId: 1,
    isFree: true,
    costPer1m: 0,
    intelligenceScore: 50,
    measuredLatencyMs: 100,
    stability: 1,
    available: true,
    rateLimitHeadroom: 1,
    contextWindow: 128000,
    capabilities: { vision: false, tools: false, json: true },
    position: 0,
    ...overrides,
  };
}

describe('ChainFilter (TEST-004)', () => {
  const filter = new ChainFilter();

  it('keeps an available candidate with headroom and matching capabilities', () => {
    const result = filter.filter([makeCandidate()], {});
    expect(result).toHaveLength(1);
  });

  it('drops unavailable candidates (dead key / in cooldown)', () => {
    const result = filter.filter([makeCandidate({ available: false })], {});
    expect(result).toHaveLength(0);
  });

  it('drops candidates with no rate-limit headroom', () => {
    const result = filter.filter([makeCandidate({ rateLimitHeadroom: 0 })], {});
    expect(result).toHaveLength(0);
  });

  it('drops candidates that do not satisfy a required capability', () => {
    const visionCapable = makeCandidate({
      modelId: 2,
      capabilities: { vision: true, tools: true, json: true },
    });
    const textOnly = makeCandidate({ modelId: 3 });
    const result = filter.filter([visionCapable, textOnly], { vision: true });
    expect(result.map((candidate) => candidate.modelId)).toEqual([2]);
  });

  it('drops candidates whose context window is smaller than estimated input tokens', () => {
    const bigWindow = makeCandidate({ modelId: 2, contextWindow: 128000 });
    const smallWindow = makeCandidate({ modelId: 3, contextWindow: 8000 });
    const result = filter.filter([bigWindow, smallWindow], { estimatedInputTokens: 32000 });
    expect(result.map((candidate) => candidate.modelId)).toEqual([2]);
  });

  it('skips context-window check when contextWindow is null (unknown)', () => {
    const result = filter.filter([makeCandidate({ contextWindow: null })], {
      estimatedInputTokens: 999999,
    });
    expect(result).toHaveLength(1);
  });

  it('skips context-window check when estimatedInputTokens is absent', () => {
    const result = filter.filter([makeCandidate({ contextWindow: 1000 })], {});
    expect(result).toHaveLength(1);
  });

  it('keeps a candidate when contextWindow exactly equals estimatedInputTokens', () => {
    const result = filter.filter([makeCandidate({ contextWindow: 32000 })], {
      estimatedInputTokens: 32000,
    });
    expect(result).toHaveLength(1);
  });
});
