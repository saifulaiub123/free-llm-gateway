import { afterEach, describe, expect, it, vi } from 'vitest';
import { OpenRouterAdapter } from './openrouter.adapter.js';
import { GroqAdapter } from './groq.adapter.js';
import { NvidiaNimAdapter } from './nvidia-nim.adapter.js';
import { GeminiAdapter } from './gemini.adapter.js';
import { HuggingFaceAdapter } from './huggingface.adapter.js';

/** Builds a mock `fetch` returning the given JSON body + ok status, and installs it globally. */
function mockFetchJson(body: unknown, ok = true, status = 200): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('OpenAiCompatibleAdapter (via GroqAdapter)', () => {
  it('maps /models data[].id to DiscoveredModel[] and flags free under rate limits', async () => {
    mockFetchJson({ data: [{ id: 'llama-3.3-70b' }, { id: 'mixtral-8x7b' }] });
    const models = await new GroqAdapter().fetchModels('key');
    const classified = new GroqAdapter().classifyFreeModels(models);
    expect(models.map((m) => m.modelId)).toEqual(['llama-3.3-70b', 'mixtral-8x7b']);
    expect(classified.every((m) => m.isFree)).toBe(true);
  });

  it('validateKey returns false on a 401', async () => {
    mockFetchJson({}, false, 401);
    expect(await new GroqAdapter().validateKey('bad')).toBe(false);
  });
});

describe('OpenRouterAdapter', () => {
  it('flags a model free only when both prompt and completion price are 0', async () => {
    mockFetchJson({
      data: [
        { id: 'free/model', pricing: { prompt: '0', completion: '0' }, context_length: 8192 },
        { id: 'paid/model', pricing: { prompt: '0.0005', completion: '0.0015' } },
      ],
    });
    const models = await new OpenRouterAdapter().fetchModels('key');
    const byId = Object.fromEntries(models.map((m) => [m.modelId, m]));
    expect(byId['free/model']!.isFree).toBe(true);
    expect(byId['free/model']!.contextWindow).toBe(8192);
    expect(byId['paid/model']!.isFree).toBe(false);
    expect(byId['paid/model']!.outputCostPer1m).toBeCloseTo(1500);
  });
});

describe('NvidiaNimAdapter', () => {
  it('flags only curated allowlist ids as free', () => {
    const adapter = new NvidiaNimAdapter();
    const classified = adapter.classifyFreeModels([
      { modelId: 'meta/llama-3.1-8b-instruct', displayName: '', isFree: false, inputCostPer1m: 0, outputCostPer1m: 0, contextWindow: null, capabilities: { vision: false, tools: false, json: true, reasoning: false, embeddings: false } },
      { modelId: 'some/paid-model', displayName: '', isFree: false, inputCostPer1m: 0, outputCostPer1m: 0, contextWindow: null, capabilities: { vision: false, tools: false, json: true, reasoning: false, embeddings: false } },
    ]);
    expect(classified.find((m) => m.modelId === 'meta/llama-3.1-8b-instruct')!.isFree).toBe(true);
    expect(classified.find((m) => m.modelId === 'some/paid-model')!.isFree).toBe(false);
  });
});

describe('GeminiAdapter', () => {
  it('flags only curated free model ids as free', () => {
    const classified = new GeminiAdapter().classifyFreeModels([
      { modelId: 'gemini-1.5-flash', displayName: '', isFree: false, inputCostPer1m: 0, outputCostPer1m: 0, contextWindow: null, capabilities: { vision: false, tools: false, json: true, reasoning: false, embeddings: false } },
      { modelId: 'gemini-1.5-pro', displayName: '', isFree: false, inputCostPer1m: 0, outputCostPer1m: 0, contextWindow: null, capabilities: { vision: false, tools: false, json: true, reasoning: false, embeddings: false } },
    ]);
    expect(classified.find((m) => m.modelId === 'gemini-1.5-flash')!.isFree).toBe(true);
    expect(classified.find((m) => m.modelId === 'gemini-1.5-pro')!.isFree).toBe(false);
  });
});

describe('HuggingFaceAdapter', () => {
  it('returns the curated free list without any HTTP call', async () => {
    const fetchMock = mockFetchJson({});
    const models = await new HuggingFaceAdapter().fetchModels();
    expect(models.length).toBeGreaterThan(0);
    expect(models.every((m) => m.isFree)).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
