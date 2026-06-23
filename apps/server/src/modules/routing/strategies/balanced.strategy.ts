import { Injectable } from '@nestjs/common';
import type { IRoutingStrategy } from './routing-strategy.interface.js';
import { invNorm } from './normalize.js';
import {
  DEFAULT_WEIGHTS,
  type RoutingCandidate,
  type StrategyConfig,
} from '../types/routing-candidate.js';

/**
 * Weighted blend so no single dimension dominates.
 *
 * WHY normalize each signal to 0..1 first: cost and latency are unbounded while scores are 0..100, so
 * without normalization one term would swamp the others. Free candidates get the maximum cost score
 * (1). Weights come from the strategy config; {@link DEFAULT_WEIGHTS} apply when absent.
 */
@Injectable()
export class BalancedStrategy implements IRoutingStrategy {
  readonly type = 'balanced';

  order(candidates: RoutingCandidate[], config: StrategyConfig): RoutingCandidate[] {
    const weights = config.weights ?? DEFAULT_WEIGHTS;
    const score = (candidate: RoutingCandidate): number =>
      weights.cost * (candidate.isFree ? 1 : invNorm(candidate.costPer1m)) +
      weights.intelligence * (candidate.intelligenceScore / 100) +
      weights.speed * invNorm(candidate.measuredLatencyMs) +
      weights.stability * candidate.stability +
      weights.rateLimit * candidate.rateLimitHeadroom +
      weights.availability * (candidate.available ? 1 : 0);
    return [...candidates].sort((a, b) => score(b) - score(a));
  }
}
