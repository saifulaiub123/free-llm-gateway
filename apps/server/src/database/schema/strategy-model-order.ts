import { getActiveProvider } from '../providers/registry.js';
import { baseColumns } from './columns.js';
import { routingStrategies } from './routing-strategies.js';

const { table, columnKit, index } = getActiveProvider();

/**
 * The saved model order for ONE strategy (TASK-039).
 *
 * WHY a separate table: each strategy keeps its own ordered set, so switching strategy switches the
 * whole fallback chain (a core requirement, REQ-012). `position` drives `Manual.fixed` ordering.
 * Composes `baseColumns` (child ordering rows — no audit/soft-delete); `strategy_id` cascades.
 */
export const strategyModelOrder = table(
  'strategy_model_order',
  {
    ...baseColumns,
    strategyId: columnKit
      .integer('strategy_id')
      .notNull()
      .references(() => routingStrategies.id, { onDelete: 'cascade' }),
    userModelId: columnKit.integer('user_model_id').notNull(),
    position: columnKit.integer('position').notNull(),
    enabled: columnKit.boolean('enabled').notNull().default(true),
  },
  (t) => ({
    strategyIdIdx: index('strategy_model_order_strategy_id_idx').on(t.strategyId),
  }),
);
