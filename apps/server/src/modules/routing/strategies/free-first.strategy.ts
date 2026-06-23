import { Injectable } from '@nestjs/common';
import type { IRoutingStrategy } from './routing-strategy.interface.js';
import type { RoutingCandidate } from '../types/routing-candidate.js';

/** Free models first (cheapest free first), then paid ascending by cost — the cost-saver default. */
@Injectable()
export class FreeFirstStrategy implements IRoutingStrategy {
  readonly type = 'free_first';

  order(candidates: RoutingCandidate[]): RoutingCandidate[] {
    return [...candidates].sort(
      (a, b) => Number(b.isFree) - Number(a.isFree) || a.costPer1m - b.costPer1m,
    );
  }
}
