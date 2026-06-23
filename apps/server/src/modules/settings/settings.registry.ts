import { z } from 'zod';

/**
 * Declares a known setting: its scope, validation schema, default, visibility, and UI description.
 *
 * WHY a code-declared registry: settings grow over time, so the DB stores only `(scope, key, value)`
 * and this registry supplies typing, defaults, validation, and admin-UI metadata. Adding a setting is
 * one entry here — no migration, no schema change.
 */
export interface SettingDefinition<T> {
  readonly scope: 'global' | 'user';
  readonly schema: z.ZodType<T>;
  readonly default: T;
  readonly adminOnly: boolean;
  readonly description: string;
}

/** All known settings. Add a key here — no migration, no schema change. */
export const SETTINGS_REGISTRY = {
  'auth.registration_enabled': {
    scope: 'global',
    schema: z.boolean(),
    default: true,
    adminOnly: true,
    description: 'Allow new users to self-register from the public register page.',
  } satisfies SettingDefinition<boolean>,
  // Future: 'routing.max_fallback_attempts' (global), 'ui.density' (user), ...
} as const;

/** The set of known setting keys. */
export type SettingKey = keyof typeof SETTINGS_REGISTRY;

/** The typed value of a setting, inferred from its registry schema. */
export type SettingValue<K extends SettingKey> = z.infer<(typeof SETTINGS_REGISTRY)[K]['schema']>;

/** Type guard: whether an arbitrary string is a known setting key. */
export function isSettingKey(key: string): key is SettingKey {
  return Object.prototype.hasOwnProperty.call(SETTINGS_REGISTRY, key);
}

/**
 * The scope of a setting, widened to the full `'global' | 'user'` union.
 *
 * WHY a function: reading `SETTINGS_REGISTRY[key].scope` directly narrows to the single literal
 * present in the registry today, so a `scope === 'user'` branch would not type-check until a
 * user-scoped key exists. Returning through an annotated function keeps both branches valid.
 */
export function settingScope(key: SettingKey): 'global' | 'user' {
  return SETTINGS_REGISTRY[key].scope;
}

