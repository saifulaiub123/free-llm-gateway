import { OffsetPaginationSchema, FilterableSchema } from '../../../common/pipes/query.schemas.js';
import type { FilterConfig } from '../../../common/pipes/query.types.js';
import { z } from 'zod';

/**
 * Complete query schema for the models endpoint.
 * Combines pagination, filtering, and sorting.
 */
export const ModelQuerySchema = OffsetPaginationSchema.merge(FilterableSchema);

export type ModelQuery = z.infer<typeof ModelQuerySchema>;

/**
 * Whitelist of filterable columns for `GET /api/v1/models`.
 *
 * Only these columns + operators are accepted. Everything else returns 400.
 * Columns on the joined `models` table include a `join` property so the
 * FilterBuilder resolves them from the correct table.
 *
 * WHY explicit per-column config: prevents access to internal columns
 * (isDeleted, overrides JSON, capabilities JSON) and ensures SQL injection
 * cannot reach unexposed fields.
 */
export const modelFilterConfig: FilterConfig = {
  // user_models columns (primary table)
  enabled: { operators: ['eq'] },
  isCustom: { operators: ['eq'] },
  customProviderId: { operators: ['eq'] },
  providerKeyId: { operators: ['eq'] },

  // models table columns (require LEFT JOIN)
  providerId: { operators: ['eq'], join: { table: 'models', column: 'providerId' } },
  isFree: { operators: ['eq'], join: { table: 'models', column: 'isFree' } },
  displayName: { operators: ['eq', 'like'], join: { table: 'models', column: 'displayName' } },
  speedTier: { operators: ['eq', 'in'], join: { table: 'models', column: 'speedTier' } },
  intelligenceScore: {
    operators: ['eq', 'gt', 'gte', 'lt', 'lte'],
    join: { table: 'models', column: 'intelligenceScore' },
  },
  contextWindow: {
    operators: ['eq', 'gt', 'gte', 'lt', 'lte'],
    join: { table: 'models', column: 'contextWindow' },
  },
  inputCostPer1m: {
    operators: ['eq', 'gte', 'lte'],
    join: { table: 'models', column: 'inputCostPer1m' },
  },
  outputCostPer1m: {
    operators: ['eq', 'gte', 'lte'],
    join: { table: 'models', column: 'outputCostPer1m' },
  },
  stabilityBaseline: {
    operators: ['eq', 'gte'],
    join: { table: 'models', column: 'stabilityBaseline' },
  },
  createdAt: {
    operators: ['gt', 'gte', 'lt', 'lte'],
    join: { table: 'models', column: 'createdAt' },
  },
};

/**
 * Whitelist of sortable columns for `GET /api/v1/models`.
 *
 * Columns that live on the `models` table (e.g. `displayName`, `isFree`)
 * are not sortable via this endpoint because the sort uses the primary
 * table. If sort on a models column is needed, the repository can wrap
 * the sort column via a subquery or join. For now, only user_models
 * columns are sortable directly.
 *
 * WHY this restriction: Drizzle ORDER BY on a joined column requires the
 * join to be present in the query, complicating the SortBuilder. Keep it
 * simple for the pilot — user_models columns cover the common cases
 * (id, createdAt, enabled).
 */
export const modelSortableColumns = [
  'id',
  'createdAt',
  'enabled',
];
