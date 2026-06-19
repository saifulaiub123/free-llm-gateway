---
name: database-changes
description: 'Make any database change in the Free LLM Gateway @gateway/db package. USE FOR: adding or altering a Drizzle entity/table/column; adding an index, relation, or constraint; writing or regenerating a Drizzle migration; adding a NEW database dialect (e.g. MySQL/MariaDB) via the dialects/ folder + registry; changing DB_DRIVER / DB_SCHEMA / DB_TABLE_PREFIX behavior; adding a repository over Drizzle. Keywords: Drizzle, DialectModule, ColumnKit, getActiveDialect, dialect registry, dialects folder, table creator, SupportedDialect, pgTable, sqliteTable, createTable, DB_TABLE_PREFIX, DB_SCHEMA, DB_DRIVER, drizzle-kit, db:generate, db:migrate, migration, schema barrel, pluggable database, postgres, sqlite, mysql, mariadb, repository pattern, cross-driver, auditTableExtras, baseColumns, baseEntityColumns.'
---

# Database Changes (`@gateway/db`)

Load this skill before any change under `packages/db` or any schema/migration/repository work.
It encodes the tested, consistent workflow so DB changes stay cross-driver, type-safe, and in sync
with the plan. **Always obey `AGENTS.md` and the `plan-consistency` instruction first.**

## Golden rules (never violate)

1. **Every table is created via the active dialect's `table` creator.** In an entity file take
   `const { table, columnKit, index } = getActiveDialect()` (from
   [registry.ts](../../../packages/db/src/dialects/registry.ts)), or use the back-compat `sqliteTable`/
   `pgTable` barrel exports. Never hand-write a bare table name — the creator applies `DB_TABLE_PREFIX`
   and (on Postgres) `DB_SCHEMA`. A bypassed table breaks multi-tenant prefixing.
2. **Compose the shared base-column sets** from `packages/db/src/schema/columns.ts` (PAT-007 / GUD-009);
   never re-declare `id`/`createdAt` by hand. They are built ONCE from the active dialect's `ColumnKit`:
   `baseColumns` (`id`, `createdAt`) on ALL tables; `baseEntityColumns` (adds `createdBy`, `modifiedBy`,
   `modifiedAt`, `isActive`, `isDeleted`) on user-facing domain entities (users, provider keys, models,
   strategies, tokens). Append-only/high-volume tables (`request_logs`, `rate_limit_counters`,
   `cooldowns`) use only `baseColumns` (hard delete / TTL — no soft delete). `isActive` = enable/disable
   toggle; `isDeleted` = soft delete. Author entity-specific columns via the kit too (`columnKit.text(...)`,
   `columnKit.integer(...)`, `columnKit.timestamp(...)`, `columnKit.boolean(...)`) — NEVER raw `sqlite-core`/
   `pg-core` builders — so one definition works for every dialect (PAT-009).
3. **Declare FKs and indexes explicitly (GUD-010).** Every FK column gets a real `FOREIGN KEY` AND an
   index (FK columns are not auto-indexed). Wire `createdBy`/`modifiedBy` via `auditTableExtras(tableName,
   t, users.id)` (from `schema/audit.js` — the active dialect's helper) in the table's second-arg builder
   (`users` passes its own `t.id` — self-FK). Owning `user_id`/`*_id` FKs use `columnKit.integer('...')
   .references(() => parent.id, { onDelete: 'cascade' })` + `index('<table>_<col>_idx').on(t.col)` (the
   `index` from `getActiveDialect()`). Add composite indexes for hot scoped lookups.
4. **Persistence goes through a repository extending `BaseRepository<TTable>`** (PAT-008,
   `apps/server/src/common/db/base.repository.ts`): use its `findById`/`findAll`/`create`/`update`/
   `softDelete`/`hardDelete`/`exists`/`count` (each takes an optional `tx`); add only entity-specific
   queries in the concrete repo. Soft-delete-capable tables auto-filter `is_deleted = false`. Scope
   user-owned reads with `scopedToUser(userId)` (SEC-004). Wrap multi-write operations in
   `db.transaction(tx => ...)` and pass `tx` to each repository call (the Unit-of-Work convention).
5. **Stay cross-driver.** Code must run identically on PostgreSQL and SQLite. Avoid driver-specific
   column types/SQL; when unavoidable, branch on `resolveDialect()` / `isPostgres()` and test both.
6. **Never edit a committed migration.** Add a new one. Schema changes always ship a migration.
7. **Relative imports need explicit `.js` extensions** (strict `NodeNext` in `tsconfig.base.json`),
   e.g. `from './table-factory.js'`. Omitting the extension fails `typecheck`.
8. **No behavior without a test.** Add/extend a `*.spec.ts` in the same change.
9. **Run the gate:** `pnpm --filter @gateway/db test && pnpm --filter @gateway/db typecheck && pnpm --filter @gateway/db lint`.

## Procedure: Add a Drizzle entity (table)

1. Create `packages/db/src/schema/<entity>.ts`. Take the active dialect's tools + compose a base set:
   ```ts
   import { getActiveDialect } from '../dialects/registry.js';
   import { baseEntityColumns } from './columns.js'; // or baseColumns for append-only tables
   import { auditTableExtras } from './audit.js';
   import { users } from './users.js';

   const { table, columnKit, index } = getActiveDialect();

   /** TSDoc: what this table is and WHY it exists. */
   export const widgets = table('widgets', {
     ...baseEntityColumns,
     userId: columnKit.integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
     name: columnKit.text('name').notNull(),
   }, (t) => ({
     ...auditTableExtras('widgets', t, users.id), // real createdBy/modifiedBy FK + indexes (GUD-010)
     userIdIdx: index('widgets_user_id_idx').on(t.userId), // index the owning FK
   }));
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

## Procedure: Add a NEW database dialect (Open/Closed — GUD-008 / PAT-009)

> For the full step-by-step (driver install, every dialect file, `Db` union, env, tests, plan sync),
> use the dedicated **add-database-dialect** skill. The condensed steps below are the summary.

Each database is a self-contained folder under `packages/db/src/dialects/<name>/` implementing the
`DialectModule` contract. To add e.g. MySQL with **no changes to existing schema files, repositories,
or common code**:

1. **Create the folder** `packages/db/src/dialects/mysql/` with the same files as `sqlite/`:
   - `table.ts` — `mysqlTableCreator((name) => `${tablePrefix()}${name}`)`.
   - `column-kit.ts` — a `ColumnKit` over `mysql-core`, returning REAL builders cast to the canonical
     (SQLite-typed) `ColumnKit` (`... as unknown as ColumnKit`), commented.
   - `audit.ts` — audit FK+index helper using `mysql-core` `foreignKey`/`index` (cast to `AuditExtras`).
   - `connection.ts` — `createDrizzle(schema)` via `drizzle-orm/mysql2`.
   - `migrate.ts` — `runMigrator(folder?)`.
   - `index.ts` — assemble `export const mysqlDialect: DialectModule = { id: 'mysql', table, columnKit, index, auditExtras, createDrizzle, runMigrator }`.
2. **Union + register (one line each):** add `'mysql'` to `SupportedDialect` in
   [dialect.contract.ts](../../../packages/db/src/dialects/dialect.contract.ts) and one entry to
   `dialectRegistry` in [registry.ts](../../../packages/db/src/dialects/registry.ts). The
   `satisfies Record<SupportedDialect, DialectModule>` turns a missing impl into a compile error — that
   error IS the guard. NO other file changes.
3. **Migrations folder + drizzle-kit:** create `packages/db/migrations/mysql/` and add the dialect's
   branch (`out` folder + `dialect` string) to the self-contained package-root `drizzle.config.ts`
   (it branches on `DB_DRIVER` inline because drizzle-kit's loader can't import the dialect modules).
4. **Tests:** registry has the new entry; `resolveDialect()` returns it for `DB_DRIVER=mysql`;
   cross-driver persistence (round-trip + prefix + audit FK/index) passes for the new dialect.
5. **Update the plan (one edit, all locations)** per the `plan-consistency` instruction's
   "Database dialect" row: `CON-001`, `DEP-003`, the `DB_DRIVER` enum (TASK-003), `GUD-008`,
   `PAT-006`/`PAT-009`, and the phase-0.5 guide.

> **Reality check:** Drizzle ships dialect cores for **PostgreSQL, MySQL/MariaDB, and SQLite only**.
> There is **no SQL Server core** — SQL Server cannot be implemented with Drizzle (it would need a
> different ORM or raw SQL). MariaDB is covered by `mysql-core`.

## Naming & config reference

- `getActiveDialect()` (from `dialects/registry.ts`) returns the active `DialectModule` — the single
  source for `table`, `columnKit`, `index`, `auditExtras`, `createDrizzle`, `runMigrator`.
- `DialectModule` + `ColumnKit` are defined in `dialects/dialect.contract.ts`; per-dialect impls live
  in `dialects/<name>/`. Common code (schema, connection, migrate) never branches on the driver
  inline (GUD-011); the package-root `drizzle.config.ts` is the one self-contained exception.
- `DB_DRIVER` (`postgres` | `sqlite`, default `sqlite`) selects the active dialect at runtime.
- `DB_TABLE_PREFIX` (default empty) is prepended to every table name by the dialect's creator.
- `DB_SCHEMA` (default `public`) targets a Postgres schema; ignored on SQLite.
- Read these lazily via `common/env.ts` getters, never as module-level constants, so tests can vary them.

## Done checklist

- [ ] All tables created via the active dialect's `table` creator; no bare names.
- [ ] Entity columns built via `columnKit` (no raw `sqlite-core`/`pg-core` builders); one definition per entity.
- [ ] Cross-driver safe (or branched on `getActiveDialect()`/`isPostgres()` + tested).
- [ ] New migration added; no committed migration edited.
- [ ] Relative imports use `.js`; barrel updated.
- [ ] Tests added; gate green (`test && typecheck && lint`).
- [ ] Plan updated if a dialect/entity/env var changed (plan-consistency).
