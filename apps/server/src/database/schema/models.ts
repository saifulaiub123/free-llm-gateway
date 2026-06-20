import { getActiveProvider } from '../providers/registry.js';
import { baseColumns } from './columns.js';
import { providers } from './providers.js';

const { table, columnKit, index } = getActiveProvider();

/**
 * Provider model + routing metadata (TASK-028).
 *
 * WHY only `baseColumns` (no audit/soft-delete): models are a shared, provider-scoped catalog
 * populated ON DEMAND by adapters (Phase 3) — never seeded, not user-owned. Per-user enable/disable
 * and custom models live in `user_models`. `capabilities` is JSON-encoded text (the kit has no json
 * primitive); the repository (de)serializes it. Logical uniqueness of `(provider_id, model_id)` is
 * enforced by the repository's upsert (a composite index speeds that lookup) to stay cross-driver.
 */
export const models = table(
  'models',
  {
    ...baseColumns,
    providerId: columnKit
      .integer('provider_id')
      .notNull()
      .references(() => providers.id, { onDelete: 'cascade' }),
    modelId: columnKit.text('model_id').notNull(),
    displayName: columnKit.text('display_name').notNull(),
    isFree: columnKit.boolean('is_free').notNull().default(false),
    intelligenceScore: columnKit.real('intelligence_score').notNull().default(0), // 0..100 baseline
    speedTier: columnKit
      .text('speed_tier', { enum: ['slow', 'medium', 'fast'] as const })
      .notNull()
      .default('medium'),
    inputCostPer1m: columnKit.real('input_cost_per_1m').notNull().default(0),
    outputCostPer1m: columnKit.real('output_cost_per_1m').notNull().default(0),
    contextWindow: columnKit.integer('context_window'),
    capabilities: columnKit.text('capabilities').notNull(), // JSON-encoded ModelCapabilities
    stabilityBaseline: columnKit.real('stability_baseline').notNull().default(0.9),
  },
  (t) => ({
    providerModelIdx: index('models_provider_model_idx').on(t.providerId, t.modelId),
  }),
);
