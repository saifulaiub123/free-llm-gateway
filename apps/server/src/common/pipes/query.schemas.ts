import { z } from 'zod';

/**
 * Base pagination schema — every paginated endpoint extends this.
 *
 * WHY offset over keyset: simpler for the UI (page numbers, "Page 3 of 42"),
 * matches the user's mental model, and integrates well with any frontend
 * pagination library. The COUNT(*) performance cost is negligible at the
 * expected scale (<100K rows) when indexed properly.
 */
export const OffsetPaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
});

export type OffsetPagination = z.infer<typeof OffsetPaginationSchema>;

/**
 * Generic filter + sort schema — extended by each endpoint with its own config.
 *
 * `filter` is a JSON object validated at the application layer (FilterBuilder),
 * NOT by Zod (because column names and operators are dynamic).
 * `sort` is validated by regex format: `"columnName:asc"` or `"columnName:desc"`.
 */
export const FilterableSchema = z.object({
  filter: z
    .string()
    .max(16_384, 'filter must be at most 16KB')
    .optional()
    .transform((str) => {
      if (!str) return undefined;
      try {
        return JSON.parse(str) as Record<string, unknown>;
      } catch {
        throw new Error('filter must be a valid JSON object');
      }
    }),
  sort: z
    .string()
    .regex(
      /^[a-zA-Z_]+:(asc|desc)$/,
      'sort format: "column:asc" or "column:desc"',
    )
    .optional(),
});

export type Filterable = z.infer<typeof FilterableSchema>;
