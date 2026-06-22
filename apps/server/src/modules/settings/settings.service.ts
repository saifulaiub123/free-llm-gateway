import { BadRequestException, Injectable } from '@nestjs/common';
import { SettingsRepository } from './settings.repository.js';
import {
  SETTINGS_REGISTRY,
  settingScope,
  type SettingKey,
  type SettingValue,
} from './settings.registry.js';

/** A global setting plus its registry metadata, for the admin settings UI. */
export interface GlobalSettingView {
  key: SettingKey;
  value: unknown;
  default: unknown;
  adminOnly: boolean;
  description: string;
}

/**
 * Typed, validated key/value settings (TASK-072). A value resolves: per-user override → global value
 * → the registry default. Values are validated against `SETTINGS_REGISTRY[key].schema` on both read
 * and write, so a malformed stored value can never reach a caller. Uses the repository's app-level
 * upsert (no `db.transaction`) so it stays portable on libSQL `:memory:`.
 */
@Injectable()
export class SettingsService {
  constructor(private readonly repository: SettingsRepository) {}

  /** Resolves a setting: a per-user override (user-scoped keys) → global value → registry default. */
  async get<K extends SettingKey>(key: K, userId?: number): Promise<SettingValue<K>> {
    const definition = SETTINGS_REGISTRY[key];
    const scope = settingScope(key);
    if (scope === 'user' && userId !== undefined) {
      const userValue = await this.repository.findValue('user', key, userId);
      if (userValue !== undefined) {
        return this.parse(key, userValue);
      }
    }
    const globalValue = await this.repository.findValue('global', key);
    if (globalValue !== undefined) {
      return this.parse(key, globalValue);
    }
    return definition.default as SettingValue<K>;
  }

  /** Validates `value` against the registry schema, then stores it for the setting's scope. */
  async set<K extends SettingKey>(key: K, value: unknown, userId?: number): Promise<void> {
    const definition = SETTINGS_REGISTRY[key];
    const validated = definition.schema.parse(value);
    const scope = settingScope(key);
    if (scope === 'user') {
      if (userId === undefined) {
        throw new BadRequestException(`Setting "${key}" is user-scoped and requires a user`);
      }
      await this.repository.upsert('user', key, JSON.stringify(validated), userId);
      return;
    }
    await this.repository.upsert('global', key, JSON.stringify(validated));
  }

  /** Lists every global setting with its current value + registry metadata for the admin UI. */
  async listGlobal(): Promise<GlobalSettingView[]> {
    const keys = (Object.keys(SETTINGS_REGISTRY) as SettingKey[]).filter(
      (key) => SETTINGS_REGISTRY[key].scope === 'global',
    );
    return Promise.all(
      keys.map(async (key) => {
        const definition = SETTINGS_REGISTRY[key];
        return {
          key,
          value: await this.get(key),
          default: definition.default,
          adminOnly: definition.adminOnly,
          description: definition.description,
        };
      }),
    );
  }

  /** Parses + validates a stored JSON value against the key's registry schema. */
  private parse<K extends SettingKey>(key: K, raw: string): SettingValue<K> {
    return SETTINGS_REGISTRY[key].schema.parse(JSON.parse(raw)) as SettingValue<K>;
  }
}
