import { BaseLlmProviderAdapter } from './base-adapter.js';
import { UpstreamError } from './errors.js';
import type {
  ChatChunk,
  ChatRequest,
  ChatResponse,
  DiscoveredModel,
  RateLimitSignal,
} from './types.js';

/** Parses a numeric header value, returning null when absent or non-numeric. */
function numericHeader(value: string | null): number | null {
  if (value === null) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Shared implementation for providers that speak the OpenAI wire format (TASK-022).
 *
 * Concrete OpenAI-compatible providers extend this and override ONLY `toDiscoveredModel` /
 * `classifyFreeModels` when their model discovery differs. WHY: it keeps each concrete adapter tiny
 * and focused on its unique free-detection rule, while validate/chat/stream stay in one place.
 */
export abstract class OpenAiCompatibleAdapter extends BaseLlmProviderAdapter {
  /** Provider API root, e.g. `https://api.groq.com/openai/v1`. */
  protected abstract readonly baseUrl: string;

  async validateKey(apiKey: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/models`, { headers: this.authHeaders(apiKey) });
    return response.ok;
  }

  async fetchModels(apiKey: string): Promise<DiscoveredModel[]> {
    const response = await fetch(`${this.baseUrl}/models`, { headers: this.authHeaders(apiKey) });
    if (!response.ok) {
      throw new UpstreamError(response.status, await response.text());
    }
    const body = (await response.json()) as { data?: unknown[] };
    return (body.data ?? []).map((raw) => this.toDiscoveredModel(raw as Record<string, unknown>));
  }

  async chatCompletion(request: ChatRequest, apiKey: string): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { ...this.authHeaders(apiKey), 'content-type': 'application/json' },
      body: JSON.stringify({ ...request, stream: false }),
    });
    if (!response.ok) {
      throw new UpstreamError(response.status, await response.text());
    }
    return (await response.json()) as ChatResponse;
  }

  /** Streams chat-completion chunks by parsing the provider's `text/event-stream` SSE body. */
  async *streamChatCompletion(request: ChatRequest, apiKey: string): AsyncIterable<ChatChunk> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { ...this.authHeaders(apiKey), 'content-type': 'application/json' },
      body: JSON.stringify({ ...request, stream: true }),
    });
    if (!response.ok || !response.body) {
      throw new UpstreamError(response.status, await response.text());
    }
    yield* this.parseSseStream(response.body);
  }

  parseRateLimitHeaders(headers: Headers): RateLimitSignal {
    return {
      remainingRequests: numericHeader(headers.get('x-ratelimit-remaining-requests')),
      remainingTokens: numericHeader(headers.get('x-ratelimit-remaining-tokens')),
      resetMs: numericHeader(headers.get('x-ratelimit-reset-requests')),
    };
  }

  /** Authorization header; subclasses override for providers needing different/extra headers. */
  protected authHeaders(apiKey: string): Record<string, string> {
    return { authorization: `Bearer ${apiKey}` };
  }

  /**
   * Default raw→normalized mapping. Subclasses override to add cost/capability metadata or free
   * detection. The base assumes paid + JSON-capable until a subclass says otherwise.
   */
  protected toDiscoveredModel(raw: Record<string, unknown>): DiscoveredModel {
    const modelId = String(raw.id ?? '');
    return {
      modelId,
      displayName: modelId,
      isFree: false,
      inputCostPer1m: 0,
      outputCostPer1m: 0,
      contextWindow: null,
      capabilities: { vision: false, tools: false, json: true, reasoning: false, embeddings: false },
    };
  }

  /**
   * Flags every model as free. WHY a shared helper: several providers (Groq, Cerebras, GitHub Models,
   * …) expose a whole catalog that is free-to-use under rate limits with no per-model pricing, so
   * their `classifyFreeModels` is identical — keep that single decision in one place.
   */
  protected markAllFree(models: DiscoveredModel[]): DiscoveredModel[] {
    return models.map((model) => ({ ...model, isFree: true }));
  }

  /** Decodes an SSE byte stream into OpenAI `chat.completion.chunk` objects, stopping at `[DONE]`. */
  private async *parseSseStream(body: ReadableStream<Uint8Array>): AsyncIterable<ChatChunk> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        let newlineIndex = buffer.indexOf('\n');
        while (newlineIndex !== -1) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);
          newlineIndex = buffer.indexOf('\n');
          if (!line.startsWith('data:')) {
            continue;
          }
          const payload = line.slice(5).trim();
          if (payload === '[DONE]') {
            return;
          }
          yield JSON.parse(payload) as ChatChunk;
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
