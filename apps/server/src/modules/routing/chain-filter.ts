import { Injectable } from '@nestjs/common';
import type { RequestCapabilities, RoutingCandidate } from './types/routing-candidate.js';

/**
 * Removes candidates the router must never try (TASK-041).
 *
 * WHY a dedicated class (SRP): filtering and ordering are different responsibilities — keeping them
 * apart makes each trivially testable and lets every strategy reuse the exact same eligibility rules.
 * A candidate survives only if it is available (healthy key, not in cooldown), has rate-limit headroom,
 * supports every capability the request requires, AND its context window can fit the estimated input
 * tokens.
 *
 * Context-window check: when the request provides an estimated token count AND the model declares a
 * known `contextWindow`, candidates whose window is smaller than the estimate are dropped so the
 * upstream provider never sees a request guaranteed to fail with a context-length error. Unknown
 * contextWindow or unknown estimate → skip the check (let the upstream decide).
 */
@Injectable()
export class ChainFilter {
  /** Returns only the candidates eligible for the request. */
  filter(candidates: RoutingCandidate[], required: RequestCapabilities): RoutingCandidate[] {
    return candidates.filter(
      (candidate) =>
        candidate.available &&
        candidate.rateLimitHeadroom > 0 &&
        this.capabilityMatch(candidate, required) &&
        this.contextWindowMatch(candidate, required),
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

  /**
   * True when the candidate's context window can fit the estimated input token count.
   *
   * WHY skipped when either value is absent: a null contextWindow or null estimatedInputTokens means
   * the data isn't available — we let the upstream provider make the final determination rather than
   * reject prematurely.
   */
  private contextWindowMatch(
    candidate: RoutingCandidate,
    required: RequestCapabilities,
  ): boolean {
    if (required.estimatedInputTokens == null || candidate.contextWindow == null) {
      return true; // unknown window or unknown estimate — let upstream decide
    }
    return candidate.contextWindow >= required.estimatedInputTokens;
  }
}
