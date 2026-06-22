import { Injectable } from '@nestjs/common';
import { SettingsRepository } from './settings.repository.js';

/**
 * Coded fallbacks applied when neither a user nor a global row exists for a key. WHY in code: these
 * are the system's safe defaults; a DB row only ever overrides them.
 */
export const CODED_SETTING_DEFAULTS: Readonly<Record<string, unknown>> = {
  'routing.max_fallback_attempts': 20,
  'routing.cooldown_base_ms': 1_000,
  'routing.metric_window_ms': 300_000,
};

/**
 * Scoped key/value settings (TASK-047): a user value overrides the global value, which overrides the
 * coded default. (Phase 10 promotes this into a dedicated `SettingsModule` with a typed registry.)
 */
@Injectable()
export class SettingsService {
  constructor(private readonly repository: SettingsRepository) {}

  /** Resolves a setting: user override → global → coded default. */
  async get<T = unknown>(key: string, userId?: number): Promise<T> {
    if (userId !== undefined) {
      const userValue = await this.repository.findValue('user', key, userId);
      if (userValue !== undefined) {
        return JSON.parse(userValue) as T;
      }
    }
    const globalValue = await this.repository.findValue('global', key);
    if (globalValue !== undefined) {
      return JSON.parse(globalValue) as T;
    }
    return CODED_SETTING_DEFAULTS[key] as T;
  }

  /** Sets the global value for a key. */
  setGlobal(key: string, value: unknown): Promise<void> {
    return this.repository.upsert('global', key, JSON.stringify(value));
  }

  /** Sets a user's override value for a key. */
  setUser(userId: number, key: string, value: unknown): Promise<void> {
    return this.repository.upsert('user', key, JSON.stringify(value), userId);
  }
}
