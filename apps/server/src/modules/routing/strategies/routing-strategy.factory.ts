import { BadRequestException, Injectable } from '@nestjs/common';
import type { IRoutingStrategy } from './routing-strategy.interface.js';
import { ManualStrategy } from './manual.strategy.js';
import { FreeFirstStrategy } from './free-first.strategy.js';
import { FastestStrategy } from './fastest.strategy.js';
import { SmartStrategy } from './smart.strategy.js';
import { BalancedStrategy } from './balanced.strategy.js';

/**
 * Resolves a strategy type to its implementation (TASK-043).
 *
 * Open/Closed: adding a strategy means registering it here only — `ChainOrderer`, `RoutingService`,
 * and the existing strategies stay untouched.
 */
@Injectable()
export class RoutingStrategyFactory {
  private readonly strategies: Map<string, IRoutingStrategy>;

  constructor(
    manual: ManualStrategy,
    freeFirst: FreeFirstStrategy,
    fastest: FastestStrategy,
    smart: SmartStrategy,
    balanced: BalancedStrategy,
  ) {
    this.strategies = new Map(
      [manual, freeFirst, fastest, smart, balanced].map((strategy) => [strategy.type, strategy]),
    );
  }

  /** Returns the strategy for a type, or throws `400` for an unknown type. */
  get(type: string): IRoutingStrategy {
    const strategy = this.strategies.get(type);
    if (!strategy) {
      throw new BadRequestException(`Unknown routing strategy "${type}"`);
    }
    return strategy;
  }
}
