import { OpenAiCompatibleAdapter } from '../base/openai-compatible-adapter.js';
import type { DiscoveredModel } from '../base/types.js';

/**
 * Cloudflare Workers AI adapter (OpenAI-compatible gateway).
 *
 * The catalog is free within the account's daily allocation, so discovered models are flagged free.
 * NOTE: the base URL embeds an `{account_id}` placeholder; the per-account URL substitution is wired
 * from the user's provider-key config in the gateway phase.
 */
export class CloudflareAdapter extends OpenAiCompatibleAdapter {
  readonly providerKey = 'cloudflare';
  protected readonly baseUrl = 'https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1';

  classifyFreeModels(models: DiscoveredModel[]): DiscoveredModel[] {
    return this.markAllFree(models);
  }
}
