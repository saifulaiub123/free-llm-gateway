import { getActiveProvider } from '../providers/registry.js';
import { baseColumns } from './columns.js';

const { table, columnKit, index } = getActiveProvider();

/**
 * Per-user live overlay of model behavior (TASK-035): rolling success/failure counts (stability) and
 * rolling average latency (speed). The auto-strategies read these aggregates when ordering candidates.
 *
 * WHY only `baseColumns`, no FKs: an append-only-style aggregate maintained by `RuntimeStatsService`
 * on the hot path; logical uniqueness of `(user, model)` is kept by the writer's upsert and sped by
 * the composite index. `updatedAt` tracks the last aggregate write.
 */
export const modelRuntimeStats = table(
  'model_runtime_stats',
  {
    ...baseColumns,
    userId: columnKit.integer('user_id').notNull(),
    modelId: columnKit.integer('model_id').notNull(),
    successCount: columnKit.integer('success_count').notNull().default(0),
    failureCount: columnKit.integer('failure_count').notNull().default(0),
    avgLatencyMs: columnKit.real('avg_latency_ms').notNull().default(0),
    lastSuccessAt: columnKit.timestamp('last_success_at'),
    updatedAt: columnKit.timestamp('updated_at').notNull(),
  },
  (t) => ({
    userModelIdx: index('model_runtime_stats_user_model_idx').on(t.userId, t.modelId),
  }),
);
