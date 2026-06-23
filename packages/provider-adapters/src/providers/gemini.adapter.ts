import { OpenAiCompatibleAdapter } from '../base/openai-compatible-adapter.js';
import type { DiscoveredModel } from '../base/types.js';

/**
 * Google Gemini adapter via Google's **OpenAI-compatible** endpoint
 * (`generativelanguage.googleapis.com/v1beta/openai`).
 *
 * WHY it extends `OpenAiCompatibleAdapter` (not the base directly): Google ships an OpenAI-wire
 * endpoint that accepts a `Bearer <API_KEY>` and serves `/models` + `/chat/completions`, so no shape
 * translation is needed. Only free classification differs — Gemini exposes no pricing, so a curated
 * free-tier allowlist flags the free models.
 */
export class GeminiAdapter extends OpenAiCompatibleAdapter {
  readonly providerKey = 'gemini';
  protected readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta/openai';

  private static readonly CURATED_FREE = new Set<string>([
    'gemini-2.0-flash-exp',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
  ]);

  /** Gemini exposes no pricing; flag the curated free-tier model ids as free. */
  classifyFreeModels(models: DiscoveredModel[]): DiscoveredModel[] {
    return models.map((model) => ({
      ...model,
      isFree: GeminiAdapter.CURATED_FREE.has(model.modelId),
    }));
  }
}
