import { BadRequestException } from '@nestjs/common';
import { SQL, asc, desc } from 'drizzle-orm';
import type { AnyTable } from 'drizzle-orm';

/**
 * Builds a Drizzle `ORDER BY` clause from a validated sort directive.
 *
 * WHY a separate builder: same per-endpoint whitelist pattern as FilterBuilder.
 * Each endpoint declares which columns are sortable. Unknown or internal columns
 * are rejected with 400.
 *
 * Default sort is `id DESC` (newest-first) when no sort param is provided.
 */
export class SortBuilder {
  static build(
    table: AnyTable,
    sort: string | undefined,
    sortableColumns: string[],
  ): SQL[] {
    // Default: newest-first
    if (!sort) {
      const defaultCol = table['id' as keyof typeof table] as any;
      return [desc(defaultCol)];
    }

    const sep = sort.lastIndexOf(':');
    const field = sep === -1 ? sort : sort.slice(0, sep);
    const direction = sep === -1 ? 'asc' : sort.slice(sep + 1);
    const dir = direction as 'asc' | 'desc';

    if (!sortableColumns.includes(field)) {
      throw new BadRequestException(`'${field}' is not a sortable column`);
    }

    if (dir !== 'asc' && dir !== 'desc') {
      throw new BadRequestException(
        `Invalid sort direction '${dir}'. Use 'asc' or 'desc'.`,
      );
    }

    const col = table[field as keyof typeof table] as any;
    if (!col) {
      throw new BadRequestException(`Unknown column '${field}'`);
    }

    return [dir === 'desc' ? desc(col) : asc(col)];
  }
}
