import { Injectable } from '@nestjs/common';

/** Identifies a cooldown target: a provider key OR a model. */
export interface CooldownTarget {
  keyId?: number;
  modelId?: number;
}

/** Active cooldown state for a target. */
interface CooldownEntry {
  until: number;
  consecutive: number;
  reason: string;
}

/** Hard ceiling on a single cooldown duration (5 minutes). */
const MAX_COOLDOWN_MS = 5 * 60_000;

/**
 * Manages router skip-windows for keys/models (TASK-037).
 *
 * WHY escalating durations: repeated `429`s on the same key signal a harder limit, so each
 * consecutive cooldown doubles (e.g. 1s → 2s → 4s, capped at {@link MAX_COOLDOWN_MS}) to stop
 * hammering it. State is in-memory (hot read path); the `cooldowns` table is the durable backing.
 */
@Injectable()
export class CooldownService {
  private readonly cooldowns = new Map<string, CooldownEntry>();

  /** True while the target is still cooling down (`now < until`). */
  isInCooldown(target: CooldownTarget): boolean {
    const entry = this.cooldowns.get(this.targetKey(target));
    return entry !== undefined && Date.now() < entry.until;
  }

  /**
   * Places (or escalates) a cooldown on a target. Consecutive cooldowns grow exponentially from
   * `baseMs`, capped at {@link MAX_COOLDOWN_MS}.
   */
  placeOnCooldown(target: CooldownTarget, baseMs: number, reason: string): void {
    const key = this.targetKey(target);
    const previous = this.cooldowns.get(key);
    const consecutive = previous ? previous.consecutive + 1 : 0;
    const durationMs = Math.min(baseMs * 2 ** consecutive, MAX_COOLDOWN_MS);
    this.cooldowns.set(key, { until: Date.now() + durationMs, consecutive, reason });
  }

  /** When the target's cooldown ends (epoch ms), or `undefined` if none is active. */
  cooldownUntil(target: CooldownTarget): number | undefined {
    const entry = this.cooldowns.get(this.targetKey(target));
    return entry && Date.now() < entry.until ? entry.until : undefined;
  }

  /** Stable key for a target (key cooldowns and model cooldowns never collide). */
  private targetKey(target: CooldownTarget): string {
    return target.keyId !== undefined ? `key:${target.keyId}` : `model:${target.modelId}`;
  }
}
