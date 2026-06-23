import { Injectable } from '@nestjs/common';
import type { IRoutingStrategy } from './routing-strategy.interface.js';
import type { RoutingCandidate } from '../types/routing-candidate.js';

/** Lowest measured latency first. */
@Injectable()
export class FastestStrategy implements IRoutingStrategy {
  readonly type = 'fastest';

  order(candidates: RoutingCandidate[]): RoutingCandidate[] {
    return [...candidates].sort((a, b) => a.measuredLatencyMs - b.measuredLatencyMs);
  }
}
