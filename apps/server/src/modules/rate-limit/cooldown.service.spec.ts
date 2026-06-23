import { describe, expect, it } from 'vitest';
import { CooldownService } from './cooldown.service.js';

describe('CooldownService', () => {
  it('reports no cooldown for an untouched target', () => {
    const service = new CooldownService();
    expect(service.isInCooldown({ keyId: 1 })).toBe(false);
  });

  it('places a cooldown that is active immediately', () => {
    const service = new CooldownService();
    service.placeOnCooldown({ keyId: 1 }, 1_000, 'rate_limited');
    expect(service.isInCooldown({ keyId: 1 })).toBe(true);
    expect(service.isInCooldown({ keyId: 2 })).toBe(false); // unrelated target
    expect(service.isInCooldown({ modelId: 1 })).toBe(false); // key vs model never collide
  });

  it('escalates: each consecutive cooldown extends further out', () => {
    const service = new CooldownService();
    service.placeOnCooldown({ keyId: 1 }, 1_000, '429');
    const first = service.cooldownUntil({ keyId: 1 })!;
    service.placeOnCooldown({ keyId: 1 }, 1_000, '429');
    const second = service.cooldownUntil({ keyId: 1 })!;
    expect(second).toBeGreaterThan(first); // doubled window
  });
});
