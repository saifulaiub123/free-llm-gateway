import { describe, expect, it, vi } from 'vitest';
import { RoutingService } from './routing.service.js';
import type { CandidateLoader } from './candidate-loader.js';
import type { ChainFilter } from './chain-filter.js';
import type { ChainOrderer } from './chain-orderer.js';
import type { RoutingStrategyRepository } from './routing-strategy.repository.js';
import type { RoutingCandidate } from './types/routing-candidate.js';

function candidate(userModelId: number, overrides: Partial<RoutingCandidate> = {}): RoutingCandidate {
  return {
    userModelId,
    modelId: userModelId,
    upstreamModelId: `model-${userModelId}`,
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

describe('RoutingService.buildChain', () => {
  it('loads, filters, resolves the strategy, attaches saved positions, and orders', async () => {
    const loaded = [candidate(1), candidate(2)];
    const eligible = [candidate(1), candidate(2)];
    const loadForUser = vi.fn().mockResolvedValue(loaded);
    const filter = vi.fn().mockReturnValue(eligible);
    const resolveForUser = vi.fn().mockResolvedValue({
      type: 'manual',
      config: { manualMode: 'fixed' },
      positionByUserModelId: new Map([
        [1, 5],
        [2, 1],
      ]),
    });
    const order = vi.fn((list: RoutingCandidate[]) => list);

    const service = new RoutingService(
      { loadForUser } as unknown as CandidateLoader,
      { filter } as unknown as ChainFilter,
      { order } as unknown as ChainOrderer,
      { resolveForUser } as unknown as RoutingStrategyRepository,
    );

    await service.buildChain(7, 'auto', 'manual', { vision: true });

    expect(loadForUser).toHaveBeenCalledWith(7, 'auto');
    expect(filter).toHaveBeenCalledWith(loaded, { vision: true });
    expect(resolveForUser).toHaveBeenCalledWith(7, 'manual');
    // ChainOrderer received candidates with the saved positions attached.
    const orderedArg = order.mock.calls[0]![0] as RoutingCandidate[];
    expect(orderedArg.find((c) => c.userModelId === 1)!.position).toBe(5);
    expect(orderedArg.find((c) => c.userModelId === 2)!.position).toBe(1);
    expect(order).toHaveBeenCalledWith(expect.any(Array), 'manual', { manualMode: 'fixed' });
  });
});
