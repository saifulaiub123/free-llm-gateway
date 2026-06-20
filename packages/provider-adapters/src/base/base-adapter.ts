import type {
  ChatChunk,
  ChatRequest,
  ChatResponse,
  DiscoveredModel,
  RateLimitSignal,
} from './types.js';

/**
 * The contract every provider adapter implements (TASK-021).
 *
 * WHY one class per provider (not a single config-driven adapter): free-model DISCOVERY differs
 * fundamentally per provider — OpenRouter encodes price in `/models`, HuggingFace has no list
 * endpoint at all, Gemini needs request/response translation. Inheritance lets shared OpenAI-wire
 * behavior live in `OpenAiCompatibleAdapter` while each provider owns only its quirks (Open/Closed):
 * adding a provider is a new subclass + one `AdapterRegistry` entry + one catalog seed row, with no
 * change to the router or other adapters.
 */
export abstract class BaseLlmProviderAdapter {
  /** Stable key matching the provider catalog row and the `AdapterRegistry`. */
  abstract readonly providerKey: string;

  /** Returns true when the key authenticates against the provider. */
  abstract validateKey(apiKey: string): Promise<boolean>;

  /** Retrieves and normalizes the provider's model list. Implementations know their own endpoint/shape. */
  abstract fetchModels(apiKey: string): Promise<DiscoveredModel[]>;

  /** Marks which discovered models are free. Provider-specific rule (price, curated list, …). */
  abstract classifyFreeModels(models: DiscoveredModel[]): DiscoveredModel[];

  /** Performs a non-streaming chat completion against the provider. */
  abstract chatCompletion(request: ChatRequest, apiKey: string): Promise<ChatResponse>;

  /** Performs a streaming chat completion, yielding OpenAI-shaped SSE chunks. */
  abstract streamChatCompletion(request: ChatRequest, apiKey: string): AsyncIterable<ChatChunk>;

  /** Extracts rate-limit signals from a provider HTTP response for the routing ledger. */
  abstract parseRateLimitHeaders(headers: Headers): RateLimitSignal;
}
