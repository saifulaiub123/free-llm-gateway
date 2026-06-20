import { OpenAiCompatibleAdapter } from '../base/openai-compatible-adapter.js';
import type { DiscoveredModel } from '../base/types.js';

/**
 * Groq adapter. Groq's hosted catalog is free-to-use under rate limits with no per-model pricing in
 * `/models`, so every discovered model is flagged free.
 */
export class GroqAdapter extends OpenAiCompatibleAdapter {
  readonly providerKey = 'groq';
  protected readonly baseUrl = 'https://api.groq.com/openai/v1';

  classifyFreeModels(models: DiscoveredModel[]): DiscoveredModel[] {
    return this.markAllFree(models);
  }
}
