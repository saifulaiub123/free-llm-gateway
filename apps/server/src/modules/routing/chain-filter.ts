import { Injectable } from '@nestjs/common';
import type { RequestCapabilities, RoutingCandidate } from './types/routing-candidate.js';

/**
 * Removes candidates the router must never try (TASK-041).
 *
 * WHY a dedicated class (SRP): filtering and ordering are different responsibilities — keeping them
 * apart makes each trivially testable and lets every strategy reuse the exact same eligibility rules.
 * A candidate survives only if it is available (healthy key, not in cooldown), has rate-limit headroom,
 * and supports every capability the request requires.
 */
@Injectable()
export class ChainFilter {
  /** Returns only the candidates eligible for the request. */
  filter(candidates: RoutingCandidate[], required: RequestCapabilities): RoutingCandidate[] {
    return candidates.filter(
      (candidate) =>
        candidate.available &&
        candidate.rateLimitHeadroom > 0 &&
        this.capabilityMatch(candidate, required),
    );
  }

  /** True when the candidate supports every capability the request demands. */
  private capabilityMatch(candidate: RoutingCandidate, required: RequestCapabilities): boolean {
    if (required.vision && !candidate.capabilities.vision) {
      return false;
    }
    if (required.tools && !candidate.capabilities.tools) {
      return false;
    }
    if (required.json && !candidate.capabilities.json) {
      return false;
    }
    return true;
  }
}
