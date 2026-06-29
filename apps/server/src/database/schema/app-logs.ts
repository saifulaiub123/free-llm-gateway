import { getActiveProvider } from '../providers/registry.js';
import { baseColumns } from './columns.js';

const { table, columnKit, index } = getActiveProvider();

/**
 * One row per application-level error logged by {@link AppLogService}.
 *
 * WHY a separate table (not the analytics `request_logs`): this stores operational errors
 * (4xx / 5xx responses and unhandled exceptions) that operators query to trace production
 * issues, whereas `request_logs` tracks every chat-completion call for the cost-saved metric.
 * Using only `baseColumns` (no FKs, no soft-delete) keeps it lean and append-only; the
 * composite index on `(level, created_at)` covers the typical "show me recent errors" query.
 */
export const appLogs = table(
  'app_logs',
  {
    ...baseColumns,
    level: columnKit.text('level').notNull(),
    statusCode: columnKit.integer('status_code'),
    message: columnKit.text('message').notNull(),
    stack: columnKit.text('stack'),
    method: columnKit.text('method'),
    url: columnKit.text('url'),
    userId: columnKit.integer('user_id'),
    metadata: columnKit.text('metadata'),
    resolved: columnKit.boolean('resolved').notNull().default(false),
  },
  (t) => ({
    levelCreatedIdx: index('app_logs_level_created_idx').on(t.level, t.createdAt),
  }),
);
