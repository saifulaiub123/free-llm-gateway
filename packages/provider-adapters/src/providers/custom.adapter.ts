import { OpenAiCompatibleAdapter } from '../base/openai-compatible-adapter.js';
import type { DiscoveredModel } from '../base/types.js';

/**
 * Custom OpenAI-compatible adapter for a user-supplied endpoint.
 *
 * WHY `validateKey` is lenient and `baseUrl` is empty: a custom provider's real base URL comes from
 * the user's provider-key configuration, not a constant, so this singleton cannot probe it here. The
 * per-config base URL is wired in the gateway phase; until then the key is accepted and its models are
 * treated as the user's own (free) catalog.
 */
export class CustomOpenAiAdapter extends OpenAiCompatibleAdapter {
  readonly providerKey = 'custom';
  protected readonly baseUrl = '';

  override async validateKey(): Promise<boolean> {
    // Cannot probe without the user's configured base URL; accept and validate on first real call.
    return true;
  }

  classifyFreeModels(models: DiscoveredModel[]): DiscoveredModel[] {
    return this.markAllFree(models);
  }
}
