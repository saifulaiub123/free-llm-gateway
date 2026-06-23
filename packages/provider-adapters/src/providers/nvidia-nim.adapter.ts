import { OpenAiCompatibleAdapter } from '../base/openai-compatible-adapter.js';
import type { DiscoveredModel } from '../base/types.js';

/**
 * NVIDIA NIM adapter (NVIDIA-hosted preview endpoints at `integrate.api.nvidia.com`).
 *
 * Those endpoints are free-to-try under rate limits and `/models` exposes no pricing, so a curated
 * allowlist flags the free-tier catalog. WHY in-adapter: this provider quirk stays out of the core —
 * updating the free list is a one-file change.
 */
export class NvidiaNimAdapter extends OpenAiCompatibleAdapter {
  readonly providerKey = 'nvidia-nim';
  protected readonly baseUrl = 'https://integrate.api.nvidia.com/v1';

  private static readonly CURATED_FREE = new Set<string>([
    'meta/llama-3.3-70b-instruct',
    'meta/llama-3.1-8b-instruct',
    'deepseek-ai/deepseek-r1',
  ]);

  /** `/models` has no pricing, so flag the curated free-to-try ids as free. */
  classifyFreeModels(models: DiscoveredModel[]): DiscoveredModel[] {
    return models.map((model) => ({
      ...model,
      isFree: NvidiaNimAdapter.CURATED_FREE.has(model.modelId),
    }));
  }
}
