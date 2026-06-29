import { createRequire } from 'node:module';
import type { PgColumnBuilderBase } from 'drizzle-orm/pg-core';
import type { TableCreator } from '../provider.contract.js';
import { dbSchema, tablePrefix } from '../../common/env.js';

/**
 * PostgreSQL table creator that applies the configurable `DB_TABLE_PREFIX` and `DB_SCHEMA`.
 *
 * WHY a manual wrapper: `pgTableCreator` from drizzle-orm always passes `void 0` as the schema
 * parameter, causing drizzle-kit to emit `REFERENCES "public"."..."` in migration SQL. By calling
 * `pgTableWithSchema` directly (which IS exported from the JS barrel even though it's absent from
 * the public .d.ts), the generated DDL targets the correct namespace and FK constraints reference
 * the right schema at migration time.
 */

// createRequire bypasses TypeScript's module-resolution — pgTableWithSchema exists in the JS
// barrel but has no .d.ts declaration. CJS require returns `any`, so no type error.
const { pgTableWithSchema } = createRequire(import.meta.url)('drizzle-orm/pg-core') as {
  pgTableWithSchema: (
    name: string,
    columns: Record<string, PgColumnBuilderBase>,
    extraConfig?: (self: Record<string, unknown>) => Record<string, unknown>,
    schema?: string,
    baseName?: string,
  ) => unknown;
};

const schema = dbSchema();

/**
 * Type-safe wrapper replicating `pgTableCreator`'s signature but forwarding `schema`.
 * Cast to the canonical {@link TableCreator} so `schema/` definitions type-check.
 */
export const pgTable = ((name: string, columns: Record<string, PgColumnBuilderBase>, extraConfig?: any) =>
  pgTableWithSchema(`${tablePrefix()}${name}`, columns, extraConfig, schema, name)) as unknown as TableCreator;
