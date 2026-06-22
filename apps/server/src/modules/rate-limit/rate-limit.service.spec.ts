import { describe, expect, it } from 'vitest';
import { RateLimitService } from './rate-limit.service.js';
import { WINDOW_MS, type CounterScope } from './types.js';

const scope: CounterScope = { userId: 1, providerId: 2, modelId: 3, keyId: 4 };

describe('RateLimitService', () => {
  it('increments per-window counters on usage', () => {
    const service = new RateLimitService();
    service.recordUsage(scope, 100);
    service.recordUsage(scope, 50);
    // 2 requests within rpm cap of 5, but token cap of 100 is exceeded (150 tpm).
    expect(service.hasHeadroom(scope, { rpm: 5 })).toBe(true);
    expect(service.hasHeadroom(scope, { tpm: 100 })).toBe(false);
  });

  it('returns false once a request cap is reached', () => {
    const service = new RateLimitService();
    service.recordUsage(scope, 0);
    service.recordUsage(scope, 0);
    expect(service.hasHeadroom(scope, { rpm: 2 })).toBe(false); // 2 requests, cap 2
    expect(service.hasHeadroom(scope, { rpm: 3 })).toBe(true);
  });

  it('rolls over elapsed windows, restoring headroom', () => {
    const service = new RateLimitService();
    service.recordUsage(scope, 200);
    expect(service.hasHeadroom(scope, { tpm: 100 })).toBe(false);
    // Advance past the per-minute window: the rollover resets tpm/rpm.
    service.windowRollover(Date.now() + WINDOW_MS.tpm + 1);
    expect(service.hasHeadroom(scope, { tpm: 100 })).toBe(true);
  });
});
