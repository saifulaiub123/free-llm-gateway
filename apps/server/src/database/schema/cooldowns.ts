import { getActiveProvider } from '../providers/registry.js';
import { baseColumns } from './columns.js';

const { table, columnKit, index } = getActiveProvider();

/**
 * A key or model the router must skip until `until` (TASK-034). Set on `429`/`5xx`/timeout.
 *
 * WHY only `baseColumns`, no FKs, nullable targets: this is an append-only ledger (the in-memory
 * `CooldownService` is the hot read path); a cooldown targets either a `key_id` OR a `model_id`, so
 * both are nullable. `createdAt` (from `baseColumns`) records when the cooldown was placed.
 */
export const cooldowns = table(
  'cooldowns',
  {
    ...baseColumns,
    keyId: columnKit.integer('key_id'),
    modelId: columnKit.integer('model_id'),
    until: columnKit.timestamp('until').notNull(),
    reason: columnKit.text('reason').notNull(),
  },
  (t) => ({
    keyIdIdx: index('cooldowns_key_id_idx').on(t.keyId),
    modelIdIdx: index('cooldowns_model_id_idx').on(t.modelId),
  }),
);
