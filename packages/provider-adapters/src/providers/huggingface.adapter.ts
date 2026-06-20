import { OpenAiCompatibleAdapter } from '../base/openai-compatible-adapter.js';
import type { DiscoveredModel } from '../base/types.js';

/**
 * HuggingFace router adapter (`router.huggingface.co/v1`).
 *
 * WHY it extends `OpenAiCompatibleAdapter` but overrides `fetchModels`: the router speaks the OpenAI
 * wire format for chat, but exposes NO machine-readable free-tier model list, so discovery returns a
 * curated set maintained here. Keeping this quirk in the adapter keeps it out of the core — updating
 * the list is a one-file change.
 */
export class HuggingFaceAdapter extends OpenAiCompatibleAdapter {
  readonly providerKey = 'huggingface';
  protected readonly baseUrl = 'https://router.huggingface.co/v1';

  private static readonly CURATED_FREE: ReadonlyArray<{ modelId: string; displayName: string }> = [
    { modelId: 'deepseek-ai/DeepSeek-V3', displayName: 'DeepSeek V3' },
    { modelId: 'Qwen/Qwen2.5-72B-Instruct', displayName: 'Qwen2.5 72B Instruct' },
    { modelId: 'meta-llama/Llama-3.3-70B-Instruct', displayName: 'Llama 3.3 70B Instruct' },
  ];

  /** No list endpoint: return the curated free catalog without any HTTP call. */
  override async fetchModels(): Promise<DiscoveredModel[]> {
    return HuggingFaceAdapter.CURATED_FREE.map(({ modelId, displayName }) => ({
      modelId,
      displayName,
      isFree: true,
      inputCostPer1m: 0,
      outputCostPer1m: 0,
      contextWindow: null,
      capabilities: { vision: false, tools: false, json: true, reasoning: false, embeddings: false },
    }));
  }

  /** `fetchModels` already returns only free models. */
  classifyFreeModels(models: DiscoveredModel[]): DiscoveredModel[] {
    return models;
  }
}
