import { describe, expect, it, vi } from 'vitest';
import { ServiceUnavailableException } from '@nestjs/common';
import { UpstreamError, type AdapterRegistry, type ChatRequest } from '@gateway/provider-adapters';
import { FallbackExecutor } from './fallback-executor.js';
import type { EncryptionService } from '../../common/crypto/encryption.service.js';
import type { UserProviderKeyRepository } from '../providers/user-provider-key.repository.js';
import type { RateLimitService } from '../rate-limit/rate-limit.service.js';
import type { CooldownService } from '../rate-limit/cooldown.service.js';
import type { RuntimeStatsService } from '../rate-limit/runtime-stats.service.js';
import type { RoutingCandidate } from '../routing/types/routing-candidate.js';

const REQUEST: ChatRequest = { model: 'auto', messages: [{ role: 'user', content: 'hi' }] };

function candidate(modelId: number, keyId: number, providerKey: string): RoutingCandidate {
  return {
    userModelId: modelId,
    modelId,
    upstreamModelId: `model-${modelId}`,
    providerKey,
    keyId,
    isFree: true,
    costPer1m: 0,
    intelligenceScore: 50,
    measuredLatencyMs: 100,
    stability: 1,
    available: true,
    rateLimitHeadroom: 1,
    capabilities: { vision: false, tools: false, json: true },
    position: 0,
  };
}

function okResponse() {
  return {
    id: 'x',
    object: 'chat.completion',
    created: 0,
    model: 'm',
    choices: [],
    usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
  };
}

/** Builds the executor with mocked collaborators and per-provider adapters. */
function build(adapters: Record<string, Record<string, unknown>>) {
  const registry = {
    get: vi.fn((key: string) => adapters[key]),
  } as unknown as AdapterRegistry;
  const encryption = { decrypt: vi.fn().mockReturnValue('plain') } as unknown as EncryptionService;
  const recordUsage = vi.fn();
  const rateLimit = { recordUsage } as unknown as RateLimitService;
  const placeOnCooldown = vi.fn();
  const cooldown = {
    isInCooldown: vi.fn().mockReturnValue(false),
    placeOnCooldown,
  } as unknown as CooldownService;
  const recordOutcome = vi.fn();
  const stats = { recordOutcome } as unknown as RuntimeStatsService;
  const keys = {
    getOwned: vi
      .fn()
      .mockImplementation((_userId: number, id: number) =>
        Promise.resolve({ id, providerId: 1, encryptedKey: 'c', adapterType: 'x' }),
      ),
  } as unknown as UserProviderKeyRepository;
  const executor = new FallbackExecutor(registry, encryption, rateLimit, cooldown, stats, keys);
  return { executor, placeOnCooldown, recordUsage, recordOutcome };
}

describe('FallbackExecutor (TEST-005)', () => {
  it('skips a 429 candidate, cools its key down, and succeeds on the next (attempts === 1)', async () => {
    const response = okResponse();
    const { executor, placeOnCooldown, recordUsage } = build({
      provA: { chatCompletion: vi.fn().mockRejectedValue(new UpstreamError(429, 'rate')) },
      provB: { chatCompletion: vi.fn().mockResolvedValue(response) },
    });

    const result = await executor.execute(
      1,
      [candidate(1, 10, 'provA'), candidate(2, 20, 'provB')],
      REQUEST,
    );

    expect(result.response).toBe(response);
    expect(result.routedVia).toBe('provB/model-2');
    expect(result.attempts).toBe(1);
    expect(placeOnCooldown).toHaveBeenCalledWith({ keyId: 10 }, expect.any(Number), 'rate_limited');
    expect(recordUsage).toHaveBeenCalledWith(expect.objectContaining({ keyId: 20 }), 10);
  });

  it('throws 503 when every candidate is rate-limited', async () => {
    const { executor } = build({
      provA: { chatCompletion: vi.fn().mockRejectedValue(new UpstreamError(429, 'rate')) },
      provB: { chatCompletion: vi.fn().mockRejectedValue(new UpstreamError(429, 'rate')) },
    });

    await expect(
      executor.execute(1, [candidate(1, 10, 'provA'), candidate(2, 20, 'provB')], REQUEST),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('surfaces a non-retryable 400 immediately without trying the next candidate', async () => {
    const next = vi.fn().mockResolvedValue(okResponse());
    const { executor } = build({
      provA: { chatCompletion: vi.fn().mockRejectedValue(new UpstreamError(400, 'bad')) },
      provB: { chatCompletion: next },
    });

    await expect(
      executor.execute(1, [candidate(1, 10, 'provA'), candidate(2, 20, 'provB')], REQUEST),
    ).rejects.toBeInstanceOf(UpstreamError);
    expect(next).not.toHaveBeenCalled();
  });
});

/** An async-generator factory that yields the given chunks. */
function streamOf(...chunks: { id: string }[]) {
  return () =>
    (async function* () {
      for (const chunk of chunks) {
        yield chunk;
      }
    })();
}

/** An async-generator factory that throws before yielding (failure before the first chunk). */
function throwingStream(error: Error) {
  return () =>
    // eslint-disable-next-line require-yield
    (async function* () {
      throw error;
    })();
}

describe('FallbackExecutor.openStream (TEST-007)', () => {
  it('opens on the first candidate whose first chunk yields, cooling earlier failures', async () => {
    const { executor, placeOnCooldown } = build({
      provA: { streamChatCompletion: throwingStream(new UpstreamError(429, 'rate')) },
      provB: { streamChatCompletion: streamOf({ id: '1' }, { id: '2' }) },
    });

    const result = await executor.openStream(
      1,
      [candidate(1, 10, 'provA'), candidate(2, 20, 'provB')],
      REQUEST,
    );

    expect(result.routedVia).toBe('provB/model-2');
    expect(result.attempts).toBe(1);
    expect(placeOnCooldown).toHaveBeenCalledWith({ keyId: 10 }, expect.any(Number), 'rate_limited');

    const collected: string[] = [];
    for await (const chunk of result.stream) {
      collected.push((chunk as unknown as { id: string }).id);
    }
    expect(collected).toEqual(['1', '2']);
  });

  it('throws 503 when every candidate fails before the first chunk', async () => {
    const { executor } = build({
      provA: { streamChatCompletion: throwingStream(new UpstreamError(429, 'rate')) },
      provB: { streamChatCompletion: throwingStream(new UpstreamError(503, 'down')) },
    });

    await expect(
      executor.openStream(1, [candidate(1, 10, 'provA'), candidate(2, 20, 'provB')], REQUEST),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
