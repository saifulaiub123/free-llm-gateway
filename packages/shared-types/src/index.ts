/**
 * Public barrel for the `@gateway/shared-types` package.
 *
 * Placeholder created in TASK-001. Shared DTOs between server and client are
 * added as later phases define them.
 */

/** A page of models returned by the queryable models endpoint. */
export interface ModelPage {
  items: unknown[];
  page: number;
  perPage: number;
  total: number;
}

/** Query params for the models endpoint. */
export interface ModelQueryParams {
  page?: number;
  per_page?: number;
  /** JSON filter object — any column, any operator (e.g. {"enabled":true,"displayName__like":"gpt"}) */
  filter?: Record<string, unknown>;
  /** Sort directive — "columnName:asc" or "columnName:desc" */
  sort?: string;
}
