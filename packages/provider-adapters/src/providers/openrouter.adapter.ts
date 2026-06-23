import { OpenAiCompatibleAdapter } from '../base/openai-compatible-adapter.js';
import type { DiscoveredModel } from '../base/types.js';

/** OpenRouter's `/models` entry shape (only the fields we read). */
interface OpenRouterModel {
  id: string;
  name?: string;
  context_length?: number;
  pricing?: { prompt?: string; completion?: string };
  architecture?: { modality?: string };
}

/**
 * OpenRouter adapter. OpenRouter exposes pricing in `/models`, so a model is free exactly when both
 * its prompt and completion prices are `"0"`. Free detection therefore happens during the raw→model
 * mapping, and `classifyFreeModels` is a pass-through.
 */
export class OpenRouterAdapter extends OpenAiCompatibleAdapter {
  readonly providerKey = 'openrouter';
  protected readonly baseUrl = 'https://openrouter.ai/api/v1';

  protected override toDiscoveredModel(raw: Record<string, unknown>): DiscoveredModel {
    const model = raw as unknown as OpenRouterModel;
    const promptPrice = Number(model.pricing?.prompt ?? '1');
    const completionPrice = Number(model.pricing?.completion ?? '1');
    return {
      modelId: model.id,
      displayName: model.name ?? model.id,
      isFree: promptPrice === 0 && completionPrice === 0,
      inputCostPer1m: promptPrice * 1_000_000,
      outputCostPer1m: completionPrice * 1_000_000,
      contextWindow: model.context_length ?? null,
      capabilities: {
        vision: model.architecture?.modality?.includes('image') ?? false,
        tools: true,
        json: true,
        reasoning: false,
        embeddings: false,
      },
    };
  }

  /** `isFree` is already computed per-model in {@link toDiscoveredModel}. */
  classifyFreeModels(models: DiscoveredModel[]): DiscoveredModel[] {
    return models;
  }
}
