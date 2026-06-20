/**
 * Shared value types for the provider-adapter library.
 *
 * These describe the normalized shapes adapters produce/consume so the server (router, models module)
 * never depends on a specific provider's raw wire format.
 */

/** Capability flags inferred per model, used by the router's ChainFilter. */
export interface ModelCapabilities {
  vision: boolean;
  tools: boolean;
  json: boolean;
  reasoning: boolean;
  embeddings: boolean;
}

/** A model normalized from a provider's raw list, ready to upsert into the catalog. */
export interface DiscoveredModel {
  modelId: string;
  displayName: string;
  isFree: boolean;
  inputCostPer1m: number;
  outputCostPer1m: number;
  contextWindow: number | null;
  capabilities: ModelCapabilities;
}

/** A single chat message in the OpenAI wire format. */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
}

/** OpenAI-compatible chat-completion request (the subset the gateway forwards upstream). */
export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
  tools?: unknown[];
  [key: string]: unknown;
}

/** OpenAI-compatible non-streaming chat-completion response (passed through to the client). */
export interface ChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: unknown[];
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  [key: string]: unknown;
}

/** A single SSE chunk from a streaming chat completion (OpenAI `chat.completion.chunk`). */
export interface ChatChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: unknown[];
  [key: string]: unknown;
}

/** Rate-limit signals parsed from a provider HTTP response, fed into the routing ledger. */
export interface RateLimitSignal {
  remainingRequests: number | null;
  remainingTokens: number | null;
  resetMs: number | null;
}
