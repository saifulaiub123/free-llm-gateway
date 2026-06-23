/**
 * Public barrel for the `@gateway/provider-adapters` package.
 *
 * Exposes the adapter contract, shared types, every concrete provider adapter, and the registry.
 * Adding a provider = a new adapter class + a registry entry + a catalog seed row (Open/Closed).
 */
export { BaseLlmProviderAdapter } from './base/base-adapter.js';
export { OpenAiCompatibleAdapter } from './base/openai-compatible-adapter.js';
export { UpstreamError } from './base/errors.js';
export type {
  ModelCapabilities,
  DiscoveredModel,
  ChatMessage,
  ChatRequest,
  ChatResponse,
  ChatChunk,
  RateLimitSignal,
} from './base/types.js';

export { AdapterRegistry } from './registry/adapter-registry.js';

export { GroqAdapter } from './providers/groq.adapter.js';
export { CerebrasAdapter } from './providers/cerebras.adapter.js';
export { OpenRouterAdapter } from './providers/openrouter.adapter.js';
export { MistralAdapter } from './providers/mistral.adapter.js';
export { GitHubModelsAdapter } from './providers/github-models.adapter.js';
export { OpenCodeAdapter } from './providers/opencode.adapter.js';
export { CloudflareAdapter } from './providers/cloudflare.adapter.js';
export { NvidiaNimAdapter } from './providers/nvidia-nim.adapter.js';
export { CustomOpenAiAdapter } from './providers/custom.adapter.js';
export { GeminiAdapter } from './providers/gemini.adapter.js';
export { HuggingFaceAdapter } from './providers/huggingface.adapter.js';
