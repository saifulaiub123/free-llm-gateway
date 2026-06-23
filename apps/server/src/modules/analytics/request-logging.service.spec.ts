import { describe, expect, it, vi } from 'vitest';
import { RequestLoggingService, type RequestLogContext } from './request-logging.service.js';
import type { RequestLogRepository } from './request-log.repository.js';
import type { RoutingCandidate } from '../routing/types/routing-candidate.js';

function candidate(modelId: number, providerKey: string, costPer1m: number): RoutingCandidate {
  return {
    userModelId: modelId,
    modelId,
    upstreamModelId: `model-${modelId}`,
    providerKey,
    keyId: modelId,
    isFree: costPer1m === 0,
    costPer1m,
    intelligenceScore: 50,
    measuredLatencyMs: 100,
    stability: 1,
    available: true,
    rateLimitHeadroom: 1,
    capabilities: { vision: false, tools: false, json: true },
    position: 0,
  };
}

function build() {
  const create = vi.fn().mockResolvedValue({});
  const repository = { create } as unknown as RequestLogRepository;
  return { service: new RequestLoggingService(repository), create };
}

const baseContext = (overrides: Partial<RequestLogContext>): RequestLogContext => ({
  userId: 1,
  requestedModel: 'auto',
  eligible: [],
  latencyMs: 100,
  status: 'success',
  ...overrides,
});

describe('RequestLoggingService.record (TASK-055)', () => {
  it('costs the free routed model at ~0 and saves the delta vs the most expensive eligible model', async () => {
    const { service, create } = build();
    // Free model served the request; a paid $2/1M model was also eligible. 1000 tokens.
    const free = candidate(1, 'groq', 0);
    const paid = candidate(2, 'openai', 2);

    await service.record(
      baseContext({
        eligible: [free, paid],
        routedVia: 'groq/1',
        fallbackAttempts: 0,
        usage: { prompt_tokens: 400, completion_tokens: 600, total_tokens: 1000 },
      }),
    );

    const row = create.mock.calls[0]?.[0];
    expect(row.routedProvider).toBe('groq');
    expect(row.routedModel).toBe('1');
    expect(row.costEstimate).toBe(0);
    // baseline = 2 * 1000 / 1_000_000 = 0.002; saved = 0.002 - 0.
    expect(row.costSaved).toBeCloseTo(0.002, 6);
    expect(row.inputTokens).toBe(400);
    expect(row.outputTokens).toBe(600);
  });

  it('records status error with null routed columns and zero cost when nothing served', async () => {
    const { service, create } = build();

    await service.record(
      baseContext({ status: 'error', eligible: [candidate(2, 'openai', 2)] }),
    );

    const row = create.mock.calls[0]?.[0];
    expect(row.status).toBe('error');
    expect(row.routedProvider).toBeNull();
    expect(row.routedModel).toBeNull();
    expect(row.costEstimate).toBe(0);
    expect(row.costSaved).toBe(0); // 0 tokens -> baseline 0
  });

  it('never throws when the repository insert fails (best-effort telemetry)', async () => {
    const create = vi.fn().mockRejectedValue(new Error('db down'));
    const service = new RequestLoggingService({ create } as unknown as RequestLogRepository);

    await expect(service.record(baseContext({}))).resolves.toBeUndefined();
  });
});
