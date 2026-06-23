import { BadRequestException } from '@nestjs/common';
import { SQL, eq, gt, gte, lt, lte, like, inArray } from 'drizzle-orm';
import type { AnyTable } from 'drizzle-orm';
import type { FilterConfig, FilterOperator } from './query.types.js';

/** Maps filter operator suffix to Drizzle operator. */
const OP_MAP: Record<FilterOperator, (col: any, val: any) => SQL> = {
  eq: (col, val) => eq(col, val),
  gt: (col, val) => gt(col, val),
  gte: (col, val) => gte(col, val),
  lt: (col, val) => lt(col, val),
  lte: (col, val) => lte(col, val),
  like: (col, val) => like(col, `%${val}%`),
  in: (col, val) => inArray(col, String(val).split(',')),
};

/**
 * Builds an array of Drizzle `SQL` predicates from a validated filter object.
 *
 * WHY a generic builder: every list endpoint uses the same filter syntax. The
 * per-endpoint `FilterConfig` controls which columns + operators are allowed,
 * preventing injection and accidental exposure of internal columns (isDeleted, etc.).
 *
 * Columns that live on a joined table (indicated by `colConfig.join`) are resolved
 * from the `joinTable` parameter rather than the primary table. This lets the single
 * builder work for both single-table and joined queries.
 */
export class FilterBuilder {
  static build(
    table: AnyTable,
    filter: Record<string, unknown> | undefined,
    config: FilterConfig,
    joinTable?: AnyTable,
  ): SQL[] {
    if (!filter) return [];

    return Object.entries(filter).map(([key, value]) => {
      // Parse operator suffix: "intelligenceScore__gte" => field="intelligenceScore", op="gte"
      const sep = key.lastIndexOf('__');
      const [field, op] =
        sep === -1
          ? [key, 'eq' as FilterOperator]
          : [key.slice(0, sep), key.slice(sep + 2) as FilterOperator];

      // Validate column is filterable
      const colConfig = config[field];
      if (!colConfig) {
        throw new BadRequestException(`'${field}' is not a filterable column`);
      }

      // Validate operator is allowed on this column
      if (!colConfig.operators.includes(op)) {
        throw new BadRequestException(
          `Operator '${op}' is not allowed on column '${field}'`,
        );
      }

      // Resolve Drizzle column reference from the correct table
      const sourceTable = colConfig.join ? joinTable : table;
      if (!sourceTable) {
        throw new BadRequestException(
          `Column '${field}' requires a JOIN but no join table was provided`,
        );
      }
      const drizzleCol = sourceTable[field as keyof typeof sourceTable] as any;
      if (!drizzleCol) {
        throw new BadRequestException(`Unknown column '${field}'`);
      }

      const drizzleOp = OP_MAP[op];
      if (!drizzleOp) {
        throw new BadRequestException(`Unknown filter operator '${op}'`);
      }

      return drizzleOp(drizzleCol, value);
    });
  }
}
