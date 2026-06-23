import { getActiveProvider } from '../providers/registry.js';
import { baseColumns } from './columns.js';

const { table, columnKit, index } = getActiveProvider();

/**
 * Sliding-window usage per `(user, provider, model, key)` (TASK-033). The router reads remaining
 * headroom from here / its in-memory cache.
 *
 * WHY only `baseColumns` and no foreign keys: this is a high-volume, append-only ledger on the hot
 * path — audit/soft-delete columns and per-row FK checks would add overhead with no benefit; the
 * referenced ids are validated upstream. Logical uniqueness of `(user, key, model, window)` is kept
 * by the writer's upsert; the composite index speeds the lookup.
 */
export const rateLimitCounters = table(
  'rate_limit_counters',
  {
    ...baseColumns,
    userId: columnKit.integer('user_id').notNull(),
    providerId: columnKit.integer('provider_id').notNull(),
    modelId: columnKit.integer('model_id').notNull(),
    keyId: columnKit.integer('key_id').notNull(),
    window: columnKit
      .text('window', { enum: ['rpm', 'rpd', 'tpm', 'tpd'] as const })
      .notNull(),
    count: columnKit.integer('count').notNull().default(0),
    windowStart: columnKit.timestamp('window_start').notNull(),
  },
  (t) => ({
    scopeIdx: index('rate_limit_counters_scope_idx').on(t.userId, t.keyId, t.modelId, t.window),
  }),
);
