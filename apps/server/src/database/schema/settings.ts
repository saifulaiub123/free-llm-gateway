import { getActiveProvider } from '../providers/registry.js';
import { baseColumns } from './columns.js';

const { table, columnKit, index } = getActiveProvider();

/**
 * Scoped key/value configuration (TASK-047): metric windows, default weights, probe intervals,
 * cooldown base, max attempts, and (later) feature flags.
 *
 * `value` is JSON-encoded text (the kit has no json primitive). A `user`-scoped row overrides the
 * `global` row for the same key; a missing row falls back to a coded default. `user_id` is null for
 * global settings. (Phase 10 promotes the service over this table into a dedicated `SettingsModule`.)
 */
export const settings = table(
  'settings',
  {
    ...baseColumns,
    scope: columnKit.text('scope', { enum: ['user', 'global'] as const }).notNull(),
    userId: columnKit.integer('user_id'),
    key: columnKit.text('key').notNull(),
    value: columnKit.text('value').notNull(), // JSON-encoded
  },
  (t) => ({
    scopeKeyIdx: index('settings_scope_key_idx').on(t.scope, t.key),
    userIdIdx: index('settings_user_id_idx').on(t.userId),
  }),
);
