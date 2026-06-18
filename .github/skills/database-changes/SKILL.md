---
name: database-changes
description: 'Make any database change in the Free LLM Gateway @gateway/db package. USE FOR: adding or altering a Drizzle entity/table/column; adding an index, relation, or constraint; writing or regenerating a Drizzle migration; adding a NEW database dialect (e.g. MySQL) via the table-factory dialect registry; changing DB_DRIVER / DB_SCHEMA / DB_TABLE_PREFIX behavior; adding a repository over Drizzle. Keywords: Drizzle, table factory, tableCreators, SupportedDialect, pgTable, sqliteTable, dialect registry, createTable, DB_TABLE_PREFIX, DB_SCHEMA, DB_DRIVER, drizzle-kit, db:generate, db:migrate, migration, schema barrel, pluggable database, postgres, sqlite, repository pattern, cross-driver.'
---

# Database Changes (`@gateway/db`)

Load this skill before any change under `packages/db` or any schema/migration/repository work.
It encodes the tested, consistent workflow so DB changes stay cross-driver, type-safe, and in sync
with the plan. **Always obey `AGENTS.md` and the `plan-consistency` instruction first.**

## Golden rules (never violate)

1. **Every table goes through the table factory.** Use a creator from
   [packages/db/src/table-factory.ts](../../../packages/db/src/table-factory.ts) (`pgTable` /
   `sqliteTable`). Never hand-write a bare table name — the factory applies `DB_TABLE_PREFIX` and
   `DB_SCHEMA`. A bypassed table breaks multi-tenant prefixing.
2. **Compose the shared base-column sets** from `packages/db/src/columns.ts` (PAT-007 / GUD-009);
   never re-declare `id`/`createdAt` by hand. `baseColumns` (`id`, `createdAt`) on ALL tables;
   `baseEntityColumns` (adds `createdBy`, `modifiedBy`, `modifiedAt`, `isDeleted`) on user-facing
   domain entities (users, provider keys, models, strategies, tokens). Append-only/high-volume
   tables (`request_logs`, `rate_limit_counters`, `cooldowns`) use only `baseColumns` (hard delete /
   TTL — no soft delete). `createdBy`/`modifiedBy` are logical FKs (plain nullable integers, no inline
   `.references()`) to avoid a circular import with `users`.
3. **Persistence goes through a repository extending `BaseRepository<TTable>`** (PAT-008,
   `apps/server/src/common/db/base.repository.ts`): use its `findById`/`findAll`/`create`/`update`/
   `softDelete`/`hardDelete`/`exists`/`count` (each takes an optional `tx`); add only entity-specific
   queries in the concrete repo. Soft-delete-capable tables auto-filter `is_deleted = false`. Scope
   user-owned reads with `scopedToUser(userId)` (SEC-004). Wrap multi-write operations in
   `db.transaction(tx => ...)` and pass `tx` to each repository call (the Unit-of-Work convention).
4. **Stay cross-driver.** Code must run identically on PostgreSQL and SQLite. Avoid driver-specific
   column types/SQL; when unavoidable, branch on `resolveDialect()` / `isPostgres()` and test both.
5. **Never edit a committed migration.** Add a new one. Schema changes always ship a migration.
6. **Relative imports need explicit `.js` extensions** (strict `NodeNext` in `tsconfig.base.json`),
   e.g. `from './table-factory.js'`. Omitting the extension fails `typecheck`.
7. **No behavior without a test.** Add/extend a `*.spec.ts` in the same change.
8. **Run the gate:** `pnpm --filter @gateway/db test && pnpm --filter @gateway/db typecheck && pnpm --filter @gateway/db lint`.

## Procedure: Add a Drizzle entity (table)

1. Create `packages/db/src/schema/<entity>.ts`. Compose a base-column set + the factory creator:
   ```ts
   import { sqliteTable } from '../table-factory.js'; // or pgTable for the pg variant
   import { integer, text } from 'drizzle-orm/sqlite-core';
   import { baseEntityColumns } from '../columns.js'; // or baseColumns for append-only tables

   /** TSDoc: what this table is and WHY it exists. */
   export const widgets = sqliteTable('widgets', {
     ...baseEntityColumns,
     userId: integer('user_id').notNull(),
     name: text('name').notNull(),
   });
   ```
2. Export it from the schema barrel (`packages/db/src/schema/index.ts`) and add relations if needed.
3. Generate the migration: `pnpm db:generate` (writes to `migrations/<driver>/`). Never edit it after commit.
4. If the column types differ per dialect, author the Postgres variant and derive the SQLite variant
   from a shared column spec (`packages/db/src/columns.ts`) — keep two variants ONLY where required.
5. Add the repository in the owning server module (`controller → service → repository → db`) by
   extending `BaseRepository<typeof widgets>`; scope every user-owned query with `scopedToUser(userId)`
   (admin bypass). Register it as a NestJS provider.
6. Tests: schema round-trip, soft-delete hides rows, `user_id` scoping, prefix applied. Run the gate.

## Procedure: Alter an existing table (add/rename/drop column, index, constraint)

1. Edit the schema file via the factory creator (keep TSDoc current).
2. `pnpm db:generate` to produce a NEW migration; do not touch existing migrations.
3. Verify the generated SQL for BOTH drivers (`migrations/postgres` and `migrations/sqlite`).
4. Update/extend repository methods and their tests. Run the gate.

## Procedure: Add a NEW database dialect (Open/Closed — GUD-008 / PAT-006)

The dialect registry in the table factory is the extension seam. To add e.g. MySQL with **no
changes to existing schema files or repositories**:

1. **Union first:** add the dialect to `SupportedDialect` in
   [table-factory.ts](../../../packages/db/src/table-factory.ts)
   (`'postgres' | 'sqlite' | 'mysql'`). The `satisfies Record<SupportedDialect, unknown>` on
   `tableCreators` now fails to compile until step 2 — that compile error IS the guard.
2. **Register the creator:**
   ```ts
   import { mysqlTableCreator } from 'drizzle-orm/mysql-core';
   export const tableCreators = {
     postgres: pgTableCreator((name) => withPrefix(name)),
     sqlite: sqliteTableCreator((name) => withPrefix(name)),
     mysql: mysqlTableCreator((name) => withPrefix(name)),
   } satisfies Record<SupportedDialect, unknown>;
   export const mysqlTable = tableCreators.mysql;
   ```
3. **Connection branch:** add the driver in the connection factory (TASK-005,
   `packages/db/src/connection.ts`) using the dialect's Drizzle adapter + node driver.
4. **Migration branch:** add the dialect in `drizzle.config.ts` (TASK-006) and the migration runner.
5. **Export** any new creator from the barrel `packages/db/src/index.ts` (with `.js` extension).
6. **Tests:** registry has an entry for the new dialect; `resolveDialect()` returns it when
   `DB_DRIVER` is set; cross-driver persistence still passes.
7. **Update the plan (one edit, all locations)** per the `plan-consistency` instruction's
   "Database dialect" row: `CON-001`, `DEP-003`, the `DB_DRIVER` enum (TASK-003), the TASK-004
   dialect registry, `GUD-008`, `PAT-006`, and the phase-0 guide.

## Naming & config reference

- `DB_DRIVER` (`postgres` | `sqlite`, default `sqlite`) selects the active dialect at runtime.
- `DB_TABLE_PREFIX` (default empty) is prepended to every table name by the factory.
- `DB_SCHEMA` (default `public`) targets a Postgres schema; ignored on SQLite.
- Read these lazily (getters), never as module-level constants, so tests can vary them per case.

## Done checklist

- [ ] All tables created via the factory; no bare names.
- [ ] Cross-driver safe (or branched on dialect + tested on both).
- [ ] New migration added; no committed migration edited.
- [ ] Relative imports use `.js`; barrel updated.
- [ ] Tests added; gate green (`test && typecheck && lint`).
- [ ] Plan updated if a dialect/entity/env var changed (plan-consistency).
