import { describe, expect, it } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { RoutingStrategyFactory } from './routing-strategy.factory.js';
import { ManualStrategy } from './manual.strategy.js';
import { FreeFirstStrategy } from './free-first.strategy.js';
import { FastestStrategy } from './fastest.strategy.js';
import { SmartStrategy } from './smart.strategy.js';
import { BalancedStrategy } from './balanced.strategy.js';

function makeFactory(): RoutingStrategyFactory {
  return new RoutingStrategyFactory(
    new ManualStrategy(),
    new FreeFirstStrategy(),
    new FastestStrategy(),
    new SmartStrategy(),
    new BalancedStrategy(),
  );
}

describe('RoutingStrategyFactory', () => {
  it('resolves each registered strategy type', () => {
    const factory = makeFactory();
    expect(factory.get('balanced')).toBeInstanceOf(BalancedStrategy);
    expect(factory.get('manual')).toBeInstanceOf(ManualStrategy);
    expect(factory.get('free_first')).toBeInstanceOf(FreeFirstStrategy);
    expect(factory.get('fastest')).toBeInstanceOf(FastestStrategy);
    expect(factory.get('smart')).toBeInstanceOf(SmartStrategy);
  });

  it('throws 400 for an unknown strategy type', () => {
    expect(() => makeFactory().get('nope')).toThrow(BadRequestException);
  });
});
