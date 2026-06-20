import { BaseLlmProviderAdapter } from '../base/base-adapter.js';
import { CerebrasAdapter } from '../providers/cerebras.adapter.js';
import { CloudflareAdapter } from '../providers/cloudflare.adapter.js';
import { CustomOpenAiAdapter } from '../providers/custom.adapter.js';
import { GeminiAdapter } from '../providers/gemini.adapter.js';
import { GitHubModelsAdapter } from '../providers/github-models.adapter.js';
import { GroqAdapter } from '../providers/groq.adapter.js';
import { HuggingFaceAdapter } from '../providers/huggingface.adapter.js';
import { MistralAdapter } from '../providers/mistral.adapter.js';
import { NvidiaNimAdapter } from '../providers/nvidia-nim.adapter.js';
import { OpenCodeAdapter } from '../providers/opencode.adapter.js';
import { OpenRouterAdapter } from '../providers/openrouter.adapter.js';

/**
 * Resolves a provider key to its adapter instance (TASK-025).
 *
 * WHY a registry: it is the single wiring point for providers. Adding a provider = construct its
 * adapter here + a catalog seed row — no router, gateway, or other adapter changes (Open/Closed).
 * Kept framework-agnostic (no NestJS decorators) so the package stays dependency-free; the server
 * provides it as a NestJS provider.
 */
export class AdapterRegistry {
  private readonly adapters = new Map<string, BaseLlmProviderAdapter>();

  constructor() {
    const instances: BaseLlmProviderAdapter[] = [
      new GeminiAdapter(),
      new GroqAdapter(),
      new CerebrasAdapter(),
      new OpenRouterAdapter(),
      new MistralAdapter(),
      new GitHubModelsAdapter(),
      new HuggingFaceAdapter(),
      new OpenCodeAdapter(),
      new CloudflareAdapter(),
      new NvidiaNimAdapter(),
      new CustomOpenAiAdapter(),
    ];
    for (const adapter of instances) {
      this.adapters.set(adapter.providerKey, adapter);
    }
  }

  /** Returns the adapter for a provider key, or throws if none is registered. */
  get(providerKey: string): BaseLlmProviderAdapter {
    const adapter = this.adapters.get(providerKey);
    if (!adapter) {
      throw new Error(`No adapter registered for provider "${providerKey}"`);
    }
    return adapter;
  }

  /** Whether an adapter exists for the given provider key. */
  has(providerKey: string): boolean {
    return this.adapters.has(providerKey);
  }

  /** All registered provider keys. */
  keys(): string[] {
    return [...this.adapters.keys()];
  }
}
