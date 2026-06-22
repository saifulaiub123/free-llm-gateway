import { Injectable } from '@nestjs/common';
import type { IRoutingStrategy } from './routing-strategy.interface.js';
import type { RoutingCandidate, StrategyConfig } from '../types/routing-candidate.js';

/**
 * Manual gives the user direct control over the chain. Sub-modes:
 *  - `fixed`: honor the saved drag order (`strategy_model_order.position`).
 *  - `stability` | `rate_limit` | `latency` | `cost`: sort live by one chosen metric.
 *
 * WHY: some users want an explicit chain; others want "always pick the most stable / most rate-limit-
 * available / fastest / cheapest right now" without hand-ordering.
 */
@Injectable()
export class ManualStrategy implements IRoutingStrategy {
  readonly type = 'manual';

  order(candidates: RoutingCandidate[], config: StrategyConfig): RoutingCandidate[] {
    const list = [...candidates];
    switch (config.manualMode ?? 'fixed') {
      case 'stability':
        return list.sort((a, b) => b.stability - a.stability);
      case 'rate_limit':
        return list.sort((a, b) => b.rateLimitHeadroom - a.rateLimitHeadroom);
      case 'latency':
        return list.sort((a, b) => a.measuredLatencyMs - b.measuredLatencyMs);
      case 'cost':
        return list.sort((a, b) => a.costPer1m - b.costPer1m);
      case 'fixed':
      default:
        return list.sort((a, b) => a.position - b.position);
    }
  }
}
