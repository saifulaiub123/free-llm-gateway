import { getActiveProvider } from '../providers/registry.js';
import { baseEntityColumns } from './columns.js';
import { auditTableExtras } from './audit.js';
import { users } from './users.js';

const { table, columnKit, index } = getActiveProvider();

/**
 * A user's named routing strategy with tunable config (TASK-039).
 *
 * `config` is JSON-encoded text ({@link StrategyConfig}: weights / manual sub-mode / capability
 * filters) — the kit has no json primitive, so the service (de)serializes it. Each user keeps several
 * strategies and marks one default. Composes `baseEntityColumns` (audit + soft-delete + `user_id`).
 */
export const routingStrategies = table(
  'routing_strategies',
  {
    ...baseEntityColumns,
    userId: columnKit
      .integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: columnKit
      .text('type', { enum: ['manual', 'free_first', 'balanced', 'fastest', 'smart'] as const })
      .notNull(),
    name: columnKit.text('name').notNull(),
    config: columnKit.text('config').notNull(), // JSON-encoded StrategyConfig
    isDefault: columnKit.boolean('is_default').notNull().default(false),
  },
  (t) => ({
    ...auditTableExtras('routing_strategies', t, users.id),
    userIdIdx: index('routing_strategies_user_id_idx').on(t.userId),
  }),
);
