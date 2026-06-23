/** Filter operator suffixes mapped to Drizzle operators. */
export type FilterOperator = 'eq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in';

/** Per-column filter configuration. */
export interface FilterColumnConfig {
  /** Allowed operators on this column. */
  operators: FilterOperator[];
  /**
   * When set, the column lives on a joined table (e.g. `models.displayName`).
   * The `FilterBuilder` resolves the column from the joined table instead of
   * the primary table when this property is present.
   */
  join?: { table: string; column: string };
}

/**
 * Per-endpoint filter configuration — maps column names to allowed operators and optional join info.
 * Unknown columns are rejected with 400.
 */
export type FilterConfig = Record<string, FilterColumnConfig>;

/** Parsed sort directive: `{ field: 'displayName', dir: 'asc' }`. */
export interface SortDirective {
  field: string;
  dir: 'asc' | 'desc';
}

/**
 * Generic page response returned by every paginated list endpoint.
 *
 * @template T The item type for the current page.
 */
export interface Page<T> {
  items: T[];
  page: number;
  perPage: number;
  total: number;
}
