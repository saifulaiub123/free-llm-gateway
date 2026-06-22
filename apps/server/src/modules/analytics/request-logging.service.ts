import { Injectable, Logger } from '@nestjs/common';
import type { ChatResponse } from '@gateway/provider-adapters';
import type { RoutingCandidate } from '../routing/types/routing-candidate.js';
import { RequestLogRepository } from './request-log.repository.js';

/** Everything the gateway hands the logger after a `/v1` call resolves (success or error). */
export interface RequestLogContext {
  userId: number;
  requestedModel: string;
  /** The capability-filtered chain that was eligible for this request (basis for cost-saved). */
  eligible: RoutingCandidate[];
  latencyMs: number;
  status: 'success' | 'error';
  /** `<provider>/<model>` the request was served by (absent on an all-failed request). */
  routedVia?: string;
  fallbackAttempts?: number;
  usage?: ChatResponse['usage'];
}

/**
 * Writes a `request_logs` row per `/v1` call (TASK-055).
 *
 * WHY cost-saved = baseline − actual: the gateway's promise is "free first to cut cost". We make that
 * visible by costing the chosen (often free) model against the most expensive ELIGIBLE model for the
 * same request; the difference is what the routing decision saved on this call. Persisting is
 * best-effort — a logging failure must never break the user's API response.
 */
@Injectable()
export class RequestLoggingService {
  private readonly logger = new Logger(RequestLoggingService.name);

  constructor(private readonly repository: RequestLogRepository) {}

  /** Persists one log row, computing `cost_estimate` and `cost_saved`. Never throws. */
  async record(context: RequestLogContext): Promise<void> {
    try {
      const totalTokens = context.usage?.total_tokens ?? 0;
      const routed = this.findRouted(context.eligible, context.routedVia);
      const actualCost = this.estimateCost(routed?.costPer1m, totalTokens);
      const baselineCost = this.maxEligibleCost(context.eligible, totalTokens);
      const [routedProvider, routedModel] = this.splitRoute(context.routedVia);
      await this.repository.create({
        userId: context.userId,
        requestedModel: context.requestedModel,
        routedProvider,
        routedModel,
        fallbackAttempts: context.fallbackAttempts ?? 0,
        latencyMs: context.latencyMs,
        inputTokens: context.usage?.prompt_tokens ?? 0,
        outputTokens: context.usage?.completion_tokens ?? 0,
        costEstimate: actualCost,
        costSaved: Math.max(0, baselineCost - actualCost),
        status: context.status,
      });
    } catch (error) {
      this.logger.warn(`Failed to persist request log: ${String(error)}`);
    }
  }

  /** Cost of `totalTokens` at a candidate's blended per-1M price (0 for free models / no route). */
  private estimateCost(costPer1m: number | undefined, totalTokens: number): number {
    if (!costPer1m) {
      return 0;
    }
    return (costPer1m * totalTokens) / 1_000_000;
  }

  /** The most expensive eligible candidate's cost — the baseline the routing decision beat. */
  private maxEligibleCost(eligible: RoutingCandidate[], totalTokens: number): number {
    return eligible.reduce(
      (max, candidate) => Math.max(max, this.estimateCost(candidate.costPer1m, totalTokens)),
      0,
    );
  }

  /** The eligible candidate that actually served the request (matched by `<provider>/<model>`). */
  private findRouted(
    eligible: RoutingCandidate[],
    routedVia?: string,
  ): RoutingCandidate | undefined {
    if (!routedVia) {
      return undefined;
    }
    return eligible.find((candidate) => `${candidate.providerKey}/${candidate.modelId}` === routedVia);
  }

  /** Splits `<provider>/<model>` into its parts (both null when the request never routed). */
  private splitRoute(routedVia?: string): [string | null, string | null] {
    if (!routedVia) {
      return [null, null];
    }
    const separator = routedVia.indexOf('/');
    if (separator === -1) {
      return [routedVia, null];
    }
    return [routedVia.slice(0, separator), routedVia.slice(separator + 1)];
  }
}
