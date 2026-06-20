import { describe, expect, it } from 'vitest';
import type { DiscoveredModel } from '@gateway/provider-adapters';
import { ModelMetadataService } from './model-metadata.service.js';

/** Builds a minimal DiscoveredModel for the given id (other fields are pass-through defaults). */
function discovered(modelId: string, overrides: Partial<DiscoveredModel> = {}): DiscoveredModel {
  return {
    modelId,
    displayName: modelId,
    isFree: true,
    inputCostPer1m: 0,
    outputCostPer1m: 0,
    contextWindow: null,
    capabilities: { vision: false, tools: false, json: true, reasoning: false, embeddings: false },
    ...overrides,
  };
}

describe('ModelMetadataService.applyBaseline', () => {
  const service = new ModelMetadataService();

  it('applies a curated baseline for a known model id', () => {
    const [row] = service.applyBaseline(1, [discovered('mixtral-8x7b')]);
    expect(row!.intelligenceScore).toBe(62);
    expect(row!.speedTier).toBe('fast');
  });

  it('matches by bare id when the model id carries a provider prefix', () => {
    const [row] = service.applyBaseline(1, [discovered('meta/llama-3.1-8b-instruct')]);
    expect(row!.intelligenceScore).toBe(55);
  });

  it('falls back to the default baseline for an unknown model id', () => {
    const [row] = service.applyBaseline(1, [discovered('totally-unknown-model')]);
    expect(row!.intelligenceScore).toBe(50);
    expect(row!.speedTier).toBe('medium');
  });

  it('passes through discovery fields (provider, cost, isFree, capabilities) + stability baseline', () => {
    const [row] = service.applyBaseline(7, [
      discovered('x', { isFree: false, inputCostPer1m: 1.5, contextWindow: 8192 }),
    ]);
    expect(row!.providerId).toBe(7);
    expect(row!.isFree).toBe(false);
    expect(row!.inputCostPer1m).toBe(1.5);
    expect(row!.contextWindow).toBe(8192);
    expect(row!.stabilityBaseline).toBeCloseTo(0.9);
    expect(row!.capabilities.json).toBe(true);
  });
});
