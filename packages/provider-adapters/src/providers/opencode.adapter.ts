import { OpenAiCompatibleAdapter } from '../base/openai-compatible-adapter.js';
import type { DiscoveredModel } from '../base/types.js';

/**
 * OpenCode Zen adapter. Its hosted catalog is free-to-use under rate limits with no per-model pricing,
 * so every discovered model is flagged free.
 */
export class OpenCodeAdapter extends OpenAiCompatibleAdapter {
  readonly providerKey = 'opencode';
  protected readonly baseUrl = 'https://opencode.ai/v1';

  classifyFreeModels(models: DiscoveredModel[]): DiscoveredModel[] {
    return this.markAllFree(models);
  }
}
