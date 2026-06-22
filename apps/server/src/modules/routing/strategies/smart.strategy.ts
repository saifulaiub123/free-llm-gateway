import { Injectable } from '@nestjs/common';
import type { IRoutingStrategy } from './routing-strategy.interface.js';
import type { RoutingCandidate } from '../types/routing-candidate.js';

/** Highest intelligence first; at equal intelligence, prefer free to respect the cost goal. */
@Injectable()
export class SmartStrategy implements IRoutingStrategy {
  readonly type = 'smart';

  order(candidates: RoutingCandidate[]): RoutingCandidate[] {
    return [...candidates].sort(
      (a, b) => b.intelligenceScore - a.intelligenceScore || Number(b.isFree) - Number(a.isFree),
    );
  }
}
