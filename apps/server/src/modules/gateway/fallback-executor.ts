import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import {
  AdapterRegistry,
  UpstreamError,
  type ChatRequest,
  type ChatResponse,
} from '@gateway/provider-adapters';
import { EncryptionService } from '../../common/crypto/encryption.service.js';
import { UserProviderKeyRepository } from '../providers/user-provider-key.repository.js';
import { RateLimitService } from '../rate-limit/rate-limit.service.js';
import { CooldownService } from '../rate-limit/cooldown.service.js';
import { RuntimeStatsService } from '../rate-limit/runtime-stats.service.js';
import type { RoutingCandidate } from '../routing/types/routing-candidate.js';

/** A successful upstream response plus the routing telemetry the gateway emits as headers. */
export interface ExecutionResult {
  response: ChatResponse;
  routedVia: string;
  attempts: number;
}

/** Maximum upstream attempts before giving up (REQ-014). */
const MAX_FALLBACK_ATTEMPTS = Number(process.env.MAX_FALLBACK_ATTEMPTS ?? 20);

/** Base cooldown applied to a key on a retryable failure; {@link CooldownService} escalates it. */
const BASE_COOLDOWN_MS = 1_000;

/**
 * Walks the ordered chain until one candidate succeeds (TASK-050).
 *
 * WHY a dedicated class (SRP): the attempt/cooldown/retry loop is the trickiest control flow in the
 * system. Isolating it from routing (which only decides ORDER) keeps both testable. It decrypts each
 * key only in memory immediately before the call, records usage + runtime stats, cools a key down on a
 * retryable error (`429`/`5xx`/timeout), surfaces a non-retryable error immediately, and owns the
 * routing telemetry the result carries.
 */
@Injectable()
export class FallbackExecutor {
  constructor(
    private readonly registry: AdapterRegistry,
    private readonly encryption: EncryptionService,
    private readonly rateLimit: RateLimitService,
    private readonly cooldown: CooldownService,
    private readonly stats: RuntimeStatsService,
    private readonly keys: UserProviderKeyRepository,
  ) {}

  /** Returns the first successful upstream response plus telemetry, or throws `503` if all fail. */
  async execute(
    userId: number,
    chain: RoutingCandidate[],
    request: ChatRequest,
  ): Promise<ExecutionResult> {
    let attempts = 0;
    let lastError: Error | undefined;

    for (const candidate of chain) {
      if (attempts >= MAX_FALLBACK_ATTEMPTS) {
        break;
      }
      if (
        this.cooldown.isInCooldown({ keyId: candidate.keyId }) ||
        this.cooldown.isInCooldown({ modelId: candidate.modelId })
      ) {
        continue;
      }
      const key = await this.keys.getOwned(userId, candidate.keyId);
      if (!key) {
        continue; // key was removed since the chain was built
      }
      const adapter = this.registry.get(candidate.providerKey);
      const startedAt = Date.now();
      attempts += 1;
      try {
        const response = await adapter.chatCompletion(
          request,
          this.encryption.decrypt(key.encryptedKey),
        );
        this.rateLimit.recordUsage(
          { userId, providerId: key.providerId, modelId: candidate.modelId, keyId: candidate.keyId },
          this.tokensOf(response),
        );
        this.stats.recordOutcome(userId, candidate.modelId, true, Date.now() - startedAt);
        return {
          response,
          routedVia: `${candidate.providerKey}/${candidate.modelId}`,
          attempts: attempts - 1, // number of fallbacks before this success
        };
      } catch (error) {
        lastError = error as Error;
        this.stats.recordOutcome(userId, candidate.modelId, false, Date.now() - startedAt);
        if (!this.isRetryable(error)) {
          throw error; // e.g. 400 bad request — surface immediately, no fallback
        }
        // 429 / 5xx / timeout — cool the key down and try the next candidate.
        this.cooldown.placeOnCooldown({ keyId: candidate.keyId }, BASE_COOLDOWN_MS, this.reasonOf(error));
      }
    }
    throw new ServiceUnavailableException(
      `All providers failed after ${attempts} attempts: ${lastError?.message ?? 'no eligible candidates'}`,
    );
  }

  /** Total tokens reported by the upstream response (0 when absent). */
  private tokensOf(response: ChatResponse): number {
    return response.usage?.total_tokens ?? 0;
  }

  /** Retryable: rate limits (`429`), upstream `5xx`, or any non-HTTP (network/timeout) error. */
  private isRetryable(error: unknown): boolean {
    if (error instanceof UpstreamError) {
      return error.status === 429 || error.status >= 500;
    }
    return true;
  }

  /** Short reason recorded on the cooldown. */
  private reasonOf(error: unknown): string {
    if (error instanceof UpstreamError) {
      return error.status === 429 ? 'rate_limited' : `status_${error.status}`;
    }
    return 'error';
  }
}
