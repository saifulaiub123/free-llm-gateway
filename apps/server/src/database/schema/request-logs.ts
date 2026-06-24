import { getActiveProvider } from '../providers/registry.js';
import { baseColumns } from './columns.js';

const { table, columnKit, index } = getActiveProvider();

/**
 * One row per `/v1` chat-completion call (TASK-054). Drives analytics and the headline cost-saved
 * metric (the product's value proof).
 *
 * WHY only `baseColumns`, no FKs: this is a high-volume, append-only audit ledger pruned by a
 * retention job (not soft-deleted), so it stays lean — `user_id`/`strategy_id`/`provider_key_id`
 * are stored as plain ids (the parent rows may be deleted while their historical logs remain) and
 * the hot `(user_id, created_at)` lookup is served by a composite index. `routed_provider`/`routed_model`
 * are nullable because an all-failed request never routes anywhere. `provider_key_id` enables account-level
 * analytics without a separate join table (KSM-008).
 */
export const requestLogs = table(
  'request_logs',
  {
    ...baseColumns,
    userId: columnKit.integer('user_id').notNull(),
    strategyId: columnKit.integer('strategy_id'),
    providerKeyId: columnKit.integer('provider_key_id'),
    requestedModel: columnKit.text('requested_model').notNull(),
    routedProvider: columnKit.text('routed_provider'),
    routedModel: columnKit.text('routed_model'),
    fallbackAttempts: columnKit.integer('fallback_attempts').notNull().default(0),
    latencyMs: columnKit.integer('latency_ms').notNull().default(0),
    inputTokens: columnKit.integer('input_tokens').notNull().default(0),
    outputTokens: columnKit.integer('output_tokens').notNull().default(0),
    costEstimate: columnKit.real('cost_estimate').notNull().default(0),
    costSaved: columnKit.real('cost_saved').notNull().default(0),
    status: columnKit.text('status').notNull(),
  },
  (t) => ({
    userCreatedIdx: index('request_logs_user_created_idx').on(t.userId, t.createdAt),
  }),
);
