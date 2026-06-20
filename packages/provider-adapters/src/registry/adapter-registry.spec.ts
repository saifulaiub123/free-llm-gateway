import { describe, expect, it } from 'vitest';
import { AdapterRegistry } from './adapter-registry.js';
import { OpenRouterAdapter } from '../providers/openrouter.adapter.js';

describe('AdapterRegistry', () => {
  const registry = new AdapterRegistry();

  it('resolves a registered provider key to its adapter instance', () => {
    expect(registry.get('openrouter')).toBeInstanceOf(OpenRouterAdapter);
    expect(registry.get('openrouter').providerKey).toBe('openrouter');
  });

  it('registers all eleven catalog providers', () => {
    expect(registry.keys().sort()).toEqual(
      [
        'cerebras',
        'cloudflare',
        'custom',
        'gemini',
        'github-models',
        'groq',
        'huggingface',
        'mistral',
        'nvidia-nim',
        'opencode',
        'openrouter',
      ].sort(),
    );
  });

  it('throws for an unknown provider key', () => {
    expect(() => registry.get('nope')).toThrow('No adapter registered for provider "nope"');
    expect(registry.has('nope')).toBe(false);
  });
});
