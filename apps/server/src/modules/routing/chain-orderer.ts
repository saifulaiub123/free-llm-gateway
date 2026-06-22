import { Injectable } from '@nestjs/common';
import { RoutingStrategyFactory } from './strategies/routing-strategy.factory.js';
import type { RoutingCandidate, StrategyConfig } from './types/routing-candidate.js';

/**
 * Applies the resolved strategy to already-filtered candidates (TASK-044).
 *
 * Pure orchestration, no DB: it resolves the strategy via the factory and delegates ordering. Keeping
 * this separate from {@link ChainFilter} preserves the filter/order SRP split.
 */
@Injectable()
export class ChainOrderer {
  constructor(private readonly factory: RoutingStrategyFactory) {}

  /** Orders the filtered candidates using the strategy registered for `type`. */
  order(filtered: RoutingCandidate[], type: string, config: StrategyConfig): RoutingCandidate[] {
    return this.factory.get(type).order(filtered, config);
  }
}
