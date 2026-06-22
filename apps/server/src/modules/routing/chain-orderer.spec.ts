import { describe, expect, it, vi } from 'vitest';
import { ChainOrderer } from './chain-orderer.js';
import type { RoutingStrategyFactory } from './strategies/routing-strategy.factory.js';
import type { IRoutingStrategy } from './strategies/routing-strategy.interface.js';
import type { RoutingCandidate, StrategyConfig } from './types/routing-candidate.js';

describe('ChainOrderer', () => {
  it('resolves the strategy by type and delegates ordering to it', () => {
    const ordered: RoutingCandidate[] = [];
    const order = vi.fn().mockReturnValue(ordered);
    const strategy = { type: 'balanced', order } as unknown as IRoutingStrategy;
    const get = vi.fn().mockReturnValue(strategy);
    const factory = { get } as unknown as RoutingStrategyFactory;

    const orderer = new ChainOrderer(factory);
    const input: RoutingCandidate[] = [];
    const config: StrategyConfig = {};

    const result = orderer.order(input, 'balanced', config);

    expect(get).toHaveBeenCalledWith('balanced');
    expect(order).toHaveBeenCalledWith(input, config);
    expect(result).toBe(ordered);
  });
});
