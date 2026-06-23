import { OpenAiCompatibleAdapter } from '../base/openai-compatible-adapter.js';
import type { DiscoveredModel } from '../base/types.js';

/**
 * Mistral adapter. Mistral's free tier ("la Plateforme") serves its catalog under rate limits; the
 * `/models` listing carries no per-model pricing, so discovered models are flagged free.
 */
export class MistralAdapter extends OpenAiCompatibleAdapter {
  readonly providerKey = 'mistral';
  protected readonly baseUrl = 'https://api.mistral.ai/v1';

  classifyFreeModels(models: DiscoveredModel[]): DiscoveredModel[] {
    return this.markAllFree(models);
  }
}
