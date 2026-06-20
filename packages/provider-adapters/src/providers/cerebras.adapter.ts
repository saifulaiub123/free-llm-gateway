import { OpenAiCompatibleAdapter } from '../base/openai-compatible-adapter.js';
import type { DiscoveredModel } from '../base/types.js';

/**
 * Cerebras adapter. The Cerebras inference catalog is free-to-use under rate limits with no per-model
 * pricing exposed, so every discovered model is flagged free.
 */
export class CerebrasAdapter extends OpenAiCompatibleAdapter {
  readonly providerKey = 'cerebras';
  protected readonly baseUrl = 'https://api.cerebras.ai/v1';

  classifyFreeModels(models: DiscoveredModel[]): DiscoveredModel[] {
    return this.markAllFree(models);
  }
}
