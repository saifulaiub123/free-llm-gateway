import { Injectable } from '@nestjs/common';
import { UserModelRepository } from '../models/user-model.repository.js';
import { ModelRepository } from '../models/model.repository.js';
import { UserProviderKeyRepository } from '../providers/user-provider-key.repository.js';
import { ProviderRepository } from '../providers/provider.repository.js';
import { RuntimeStatsService } from '../rate-limit/runtime-stats.service.js';
import { CooldownService } from '../rate-limit/cooldown.service.js';
import type { RoutingCandidate } from './types/routing-candidate.js';

/** Latency (ms) assumed for a model with no measured stats yet, by speed tier. */
const SPEED_TIER_LATENCY_MS: Record<'slow' | 'medium' | 'fast', number> = {
  slow: 2_000,
  medium: 800,
  fast: 200,
};

/**
 * Loads the routing candidates for a user (TASK-045): joins the user's enabled catalog models with
 * their metadata and a healthy provider key, then overlays the live in-memory signals (stability,
 * latency, cooldown). Strategies never touch the DB — this is the only place candidate state is read.
 *
 * NOTE: custom user models are skipped here (they carry no catalog row / key resolution yet); they are
 * wired when the gateway resolves their per-config base URL. Rate-limit headroom is `1` until per-key
 * caps are modeled.
 */
@Injectable()
export class CandidateLoader {
  constructor(
    private readonly userModels: UserModelRepository,
    private readonly models: ModelRepository,
    private readonly keys: UserProviderKeyRepository,
    private readonly providers: ProviderRepository,
    private readonly stats: RuntimeStatsService,
    private readonly cooldowns: CooldownService,
  ) {}

  /**
   * @param requestedModel `"auto"` returns all enabled candidates; an explicit model id pins to that
   *   model only.
   *
   * KSM-006/KSM-007: when a user_models row has a `providerKeyId`, that specific key is used for
   * routing instead of picking the first healthy key per provider. This means two keys for the same
   * provider produce two independent candidates, and a cooldown on one key does not block the other.
   * Legacy rows with null providerKeyId fall back to `firstHealthyKeyByProvider`.
   */
  async loadForUser(userId: number, requestedModel: string): Promise<RoutingCandidate[]> {
    const userRows = (await this.userModels.listByUser(userId)).filter(
      (row) => row.enabled && !row.isCustom && row.modelId !== null,
    );
    if (userRows.length === 0) {
      return [];
    }
    const modelById = new Map(
      (await this.models.findByIds(userRows.map((row) => row.modelId as number))).map((model) => [
        model.id,
        model,
      ]),
    );
    const providerKeyById = new Map(
      (await this.providers.listAll()).map((provider) => [provider.id, provider.key]),
    );

    // Build key metadata map for per-candidate availability checks (KSM-006).
    const userKeys = await this.keys.listByUser(userId);
    const keyById = new Map(userKeys.map((k) => [k.id, k]));
    // Legacy fallback: first healthy key per provider for rows with no providerKeyId.
    const healthyKeyByProvider = this.firstHealthyKeyByProvider(userKeys);

    const candidates: RoutingCandidate[] = [];
    for (const row of userRows) {
      const model = modelById.get(row.modelId as number);
      if (!model || (requestedModel !== 'auto' && model.modelId !== requestedModel)) {
        continue;
      }
      // Use the row's providerKeyId when set (key-scoped routing), else legacy fallback.
      const keyId = row.providerKeyId ?? healthyKeyByProvider.get(model.providerId);
      const key = keyId != null ? keyById.get(keyId) : undefined;
      const available =
        keyId != null &&
        key !== undefined &&
        key.status === 'healthy' &&
        !this.cooldowns.isInCooldown({ keyId }) &&
        !this.cooldowns.isInCooldown({ modelId: model.id });
      candidates.push({
        userModelId: row.id,
        modelId: model.id,
        upstreamModelId: model.modelId,
        providerKey: providerKeyById.get(model.providerId) ?? 'unknown',
        keyId: keyId ?? 0,
        isFree: model.isFree,
        costPer1m: (model.inputCostPer1m + model.outputCostPer1m) / 2,
        intelligenceScore: model.intelligenceScore,
        measuredLatencyMs: this.latencyOf(userId, model.id, model.speedTier),
        stability: this.stats.stabilityOf(userId, model.id),
        available,
        rateLimitHeadroom: 1,
        contextWindow: model.contextWindow ?? null,
        capabilities: this.parseCapabilities(model.capabilities),
        position: 0,
      });
    }
    return candidates;
  }

  /** Picks the first healthy key per provider id. Used as a legacy fallback for rows with no providerKeyId. */
  private firstHealthyKeyByProvider(
    keys: { id: number; providerId: number; status: string }[],
  ): Map<number, number> {
    const byProvider = new Map<number, number>();
    for (const key of keys) {
      if (key.status === 'healthy' && !byProvider.has(key.providerId)) {
        byProvider.set(key.providerId, key.id);
      }
    }
    return byProvider;
  }

  /** Measured latency, falling back to the model's speed tier when there is no history. */
  private latencyOf(userId: number, modelId: number, speedTier: string): number {
    const measured = this.stats.avgLatencyOf(userId, modelId);
    if (measured > 0) {
      return measured;
    }
    return SPEED_TIER_LATENCY_MS[speedTier as 'slow' | 'medium' | 'fast'] ?? SPEED_TIER_LATENCY_MS.medium;
  }

  /** Parses the stored JSON capabilities into the flags the filter needs. */
  private parseCapabilities(json: string): { vision: boolean; tools: boolean; json: boolean } {
    const parsed = JSON.parse(json) as Partial<{ vision: boolean; tools: boolean; json: boolean }>;
    return { vision: !!parsed.vision, tools: !!parsed.tools, json: parsed.json !== false };
  }
}
