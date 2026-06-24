import { describe, expect, it, vi } from 'vitest';
import { CandidateLoader } from './candidate-loader.js';
import type { UserModelRepository } from '../models/user-model.repository.js';
import type { ModelRepository } from '../models/model.repository.js';
import type { UserProviderKeyRepository } from '../providers/user-provider-key.repository.js';
import type { ProviderRepository } from '../providers/provider.repository.js';
import type { RuntimeStatsService } from '../rate-limit/runtime-stats.service.js';
import type { CooldownService } from '../rate-limit/cooldown.service.js';

const CAPS = JSON.stringify({ vision: false, tools: true, json: true });

/** Assembles a loader over mocked repositories/services. */
function build(options: { keyStatus?: string; inCooldown?: boolean } = {}) {
  const listUserModels = vi.fn().mockResolvedValue([
    { id: 100, enabled: true, isCustom: false, modelId: 10 }, // included
    { id: 101, enabled: false, isCustom: false, modelId: 11 }, // disabled -> excluded
    { id: 102, enabled: true, isCustom: true, modelId: null }, // custom -> excluded
  ]);
  const userModels = { listByUser: listUserModels } as unknown as UserModelRepository;
  const findByIds = vi.fn().mockResolvedValue([
    {
      id: 10,
      modelId: 'groq-llama',
      providerId: 2,
      isFree: true,
      inputCostPer1m: 0,
      outputCostPer1m: 0,
      intelligenceScore: 60,
      speedTier: 'fast',
      contextWindow: 128000,
      capabilities: CAPS,
    },
  ]);
  const models = { findByIds } as unknown as ModelRepository;
  const keys = {
    listByUser: vi
      .fn()
      .mockResolvedValue([{ id: 5, providerId: 2, status: options.keyStatus ?? 'healthy' }]),
  } as unknown as UserProviderKeyRepository;
  const providers = {
    listAll: vi.fn().mockResolvedValue([{ id: 2, key: 'groq' }]),
  } as unknown as ProviderRepository;
  const stats = {
    avgLatencyOf: vi.fn().mockReturnValue(0),
    stabilityOf: vi.fn().mockReturnValue(0.95),
  } as unknown as RuntimeStatsService;
  const cooldowns = {
    isInCooldown: vi.fn().mockReturnValue(options.inCooldown ?? false),
  } as unknown as CooldownService;
  return new CandidateLoader(userModels, models, keys, providers, stats, cooldowns);
}

describe('CandidateLoader.loadForUser', () => {
  it('builds a candidate from enabled catalog models with a healthy key + fallback latency', async () => {
    const [candidate, ...rest] = await build().loadForUser(7, 'auto');
    expect(rest).toHaveLength(0); // disabled + custom rows excluded
    expect(candidate).toMatchObject({
      userModelId: 100,
      modelId: 10,
      providerKey: 'groq',
      keyId: 5,
      isFree: true,
      intelligenceScore: 60,
      available: true,
      measuredLatencyMs: 200, // speed-tier 'fast' fallback (no measured stats)
      stability: 0.95,
    });
    expect(candidate!.capabilities).toEqual({ vision: false, tools: true, json: true });
  });

  it('marks a candidate unavailable when there is no healthy key', async () => {
    const [candidate] = await build({ keyStatus: 'invalid' }).loadForUser(7, 'auto');
    expect(candidate!.available).toBe(false);
    expect(candidate!.keyId).toBe(0);
  });

  it('marks a candidate unavailable when the key/model is in cooldown', async () => {
    const [candidate] = await build({ inCooldown: true }).loadForUser(7, 'auto');
    expect(candidate!.available).toBe(false);
  });

  it('pins to a specific requested model id', async () => {
    expect(await build().loadForUser(7, 'groq-llama')).toHaveLength(1);
    expect(await build().loadForUser(7, 'some-other-model')).toHaveLength(0);
  });
});
