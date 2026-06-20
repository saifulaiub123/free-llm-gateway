import { OpenAiCompatibleAdapter } from '../base/openai-compatible-adapter.js';
import type { DiscoveredModel } from '../base/types.js';

/**
 * GitHub Models adapter (Azure AI inference endpoint). The GitHub Models catalog is free-to-use under
 * per-account rate limits with no per-model pricing, so every discovered model is flagged free.
 */
export class GitHubModelsAdapter extends OpenAiCompatibleAdapter {
  readonly providerKey = 'github-models';
  protected readonly baseUrl = 'https://models.inference.ai.azure.com';

  classifyFreeModels(models: DiscoveredModel[]): DiscoveredModel[] {
    return this.markAllFree(models);
  }
}
