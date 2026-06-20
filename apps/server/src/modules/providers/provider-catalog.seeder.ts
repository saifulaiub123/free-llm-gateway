import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { providers } from '../../database/index.js';
import { ProviderRepository } from './provider.repository.js';

/**
 * The provider catalog seed (TASK-018) — providers ONLY, never models.
 *
 * WHY no models: free tiers change constantly and are per-key, so the model catalog is populated on
 * demand by adapters (Phase 3). `adapterType` matches the `AdapterRegistry` key.
 */
export const PROVIDER_SEED: (typeof providers.$inferInsert)[] = [
  { key: 'gemini', displayName: 'Google Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', modelsEndpoint: '/models', adapterType: 'gemini', supportsVision: true, supportsTools: true },
  { key: 'groq', displayName: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', modelsEndpoint: '/models', adapterType: 'groq', supportsTools: true },
  { key: 'cerebras', displayName: 'Cerebras', baseUrl: 'https://api.cerebras.ai/v1', modelsEndpoint: '/models', adapterType: 'cerebras' },
  { key: 'openrouter', displayName: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', modelsEndpoint: '/models', adapterType: 'openrouter', supportsTools: true, supportsVision: true },
  { key: 'mistral', displayName: 'Mistral', baseUrl: 'https://api.mistral.ai/v1', modelsEndpoint: '/models', adapterType: 'mistral', supportsTools: true },
  { key: 'github-models', displayName: 'GitHub Models', baseUrl: 'https://models.inference.ai.azure.com', modelsEndpoint: '/models', adapterType: 'github-models', supportsTools: true, supportsVision: true },
  { key: 'huggingface', displayName: 'HuggingFace', baseUrl: 'https://router.huggingface.co/v1', modelsEndpoint: null, adapterType: 'huggingface' },
  { key: 'opencode', displayName: 'OpenCode Zen', baseUrl: 'https://opencode.ai/v1', modelsEndpoint: '/models', adapterType: 'opencode' },
  { key: 'cloudflare', displayName: 'Cloudflare Workers AI', baseUrl: 'https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1', modelsEndpoint: '/models', adapterType: 'cloudflare' },
  { key: 'nvidia-nim', displayName: 'NVIDIA NIM', baseUrl: 'https://integrate.api.nvidia.com/v1', modelsEndpoint: '/models', adapterType: 'nvidia-nim', supportsTools: true, supportsVision: true },
  { key: 'custom', displayName: 'Custom (OpenAI-compatible)', baseUrl: '', modelsEndpoint: '/models', adapterType: 'custom' },
];

/** Idempotently seeds the provider catalog on application bootstrap. */
@Injectable()
export class ProviderCatalogSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(ProviderCatalogSeeder.name);

  constructor(private readonly catalog: ProviderRepository) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.catalog.seedMissing(PROVIDER_SEED);
      this.logger.log(`Provider catalog ensured (${PROVIDER_SEED.length} providers).`);
    } catch (error) {
      // Best-effort: a missing catalog table means migrations have not been applied yet (e.g. a
      // minimal test boot). Warn rather than abort startup — a real deployment runs `db:migrate`
      // before boot, so the table exists and seeding succeeds.
      this.logger.warn(
        `Skipped provider catalog seeding: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
