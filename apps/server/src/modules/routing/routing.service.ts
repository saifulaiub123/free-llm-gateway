import { Injectable } from '@nestjs/common';
import { CandidateLoader } from './candidate-loader.js';
import { ChainFilter } from './chain-filter.js';
import { ChainOrderer } from './chain-orderer.js';
import { RoutingStrategyRepository } from './routing-strategy.repository.js';
import type { RequestCapabilities, RoutingCandidate } from './types/routing-candidate.js';

/**
 * Builds the ordered fallback chain for a request (TASK-045).
 *
 * Orchestration only (SRP): load candidates → filter ineligible → resolve the strategy (config +
 * saved order) → order. The gateway's FallbackExecutor (Phase 6) consumes the result.
 */
@Injectable()
export class RoutingService {
  constructor(
    private readonly loader: CandidateLoader,
    private readonly filter: ChainFilter,
    private readonly orderer: ChainOrderer,
    private readonly strategies: RoutingStrategyRepository,
  ) {}

  /** Returns the ordered candidate chain for `userId` under `strategyType`. */
  async buildChain(
    userId: number,
    requestedModel: string,
    strategyType: string,
    capabilities: RequestCapabilities,
  ): Promise<RoutingCandidate[]> {
    const candidates = await this.loader.loadForUser(userId, requestedModel);
    const eligible = this.filter.filter(candidates, capabilities);
    const resolved = await this.strategies.resolveForUser(userId, strategyType);
    // Attach saved manual positions so Manual.fixed can honor the user's drag order.
    const positioned = eligible.map((candidate) => ({
      ...candidate,
      position: resolved.positionByUserModelId.get(candidate.userModelId) ?? candidate.position,
    }));
    return this.orderer.order(positioned, resolved.type, resolved.config);
  }
}
