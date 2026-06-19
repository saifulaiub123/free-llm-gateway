---
name: database-changes
description: 'Make any database change in the Free LLM Gateway database layer (apps/server/src/database). USE FOR: adding or altering a Drizzle entity/table/column; adding an index, relation, or constraint; writing or regenerating a Drizzle migration; adding a NEW database provider (e.g. MySQL/MariaDB) via the providers/ folder + registry; changing DB_PROVIDER / DB_SCHEMA / DB_TABLE_PREFIX behavior; adding a repository over Drizzle. Keywords: Drizzle, ProviderModule, ColumnKit, getActiveProvider, provider registry, providers folder, table creator, SupportedProvider, DatabaseService, connect, DbConnection, pgTable, sqliteTable, DB_TABLE_PREFIX, DB_SCHEMA, DB_PROVIDER, drizzle-kit, db:generate, db:migrate, migration, schema barrel, pluggable database, postgres, sqlite, libsql, mysql, mariadb, repository pattern, cross-driver, auditTableExtras, baseColumns, baseEntityColumns.'
---

# Database Changes (`apps/server/src/database`)

Load this skill before any change under `apps/server/src/database` or any schema/migration/repository
work. It encodes the tested, consistent workflow so DB changes stay cross-provider, type-safe, and in
sync with the plan. **Always obey `AGENTS.md` and the `plan-consistency` instruction first.**

## Golden rules (never violate)

1. **Every table is created via the active provider's `table` creator.** In an entity file take
   `const { table, columnKit, index } = getActiveProvider()` (from
   [registry.ts](../../../apps/server/src/database/providers/registry.ts)), or use the back-compat
   `sqliteTable`/`pgTable` exports. Never hand-write a bare table name — the creator applies
   `DB_TABLE_PREFIX` and (on Postgres) `DB_SCHEMA`. A bypassed table breaks multi-tenant prefixing.
2. **Compose the shared base-column sets** from `apps/server/src/database/schema/columns.ts`
   (PAT-007 / GUD-009); never re-declare `id`/`createdAt` by hand. They are built ONCE from the active
   provider's `ColumnKit`: `baseColumns` (`id`, `createdAt`) on ALL tables; `baseEntityColumns` (adds
   `createdBy`, `modifiedBy`, `modifiedAt`, `isActive`, `isDeleted`) on user-facing domain entities
   (users, provider keys, models, strategies, tokens). Append-only/high-volume tables (`request_logs`,
   `rate_limit_counters`, `cooldowns`) use only `baseColumns` (hard delete / TTL — no soft delete).
   `isActive` = enable/disable toggle; `isDeleted` = soft delete. Author entity-specific columns via the
   kit too (`columnKit.text(...)`, `columnKit.integer(...)`, `columnKit.timestamp(...)`,
   `columnKit.boolean(...)`) — NEVER raw `sqlite-core`/`pg-core` builders — so one definition works for
   every provider (PAT-009).
3. **Declare FKs and indexes explicitly (GUD-010).** Every FK column gets a real `FOREIGN KEY` AND an
   index (FK columns are not auto-indexed). Wire `createdBy`/`modifiedBy` via `auditTableExtras(tableName,
   t, users.id)` (from `schema/audit.js` — the active provider's helper) in the table's second-arg builder
   (`users` passes its own `t.id` — self-FK). Owning `user_id`/`*_id` FKs use `columnKit.integer('...')
   .references(() => parent.id, { onDelete: 'cascade' })` + `index('<table>_<col>_idx').on(t.col)` (the
   `index` from `getActiveProvider()`). Add composite indexes for hot scoped lookups.
4. **Persistence goes through a repository extending `BaseRepository<TTable>`** (PAT-008,
   `apps/server/src/common/db/base.repository.ts`): the concrete repo injects `DatabaseService` and calls
   `super(database, table, softDeletable)`. Use `findById`/`findAll`/`create`/`update`/`softDelete`/
   `hardDelete`/`exists`/`count` (each takes an optional `tx`); add only entity-specific queries via
   `this.exec()`. Soft-delete-capable tables auto-filter `is_deleted = false`. Scope user-owned reads with
   `scopedToUser(userId)` (SEC-004). Wrap multi-write operations in `db.transaction(tx => ...)` and pass
   `tx` to each repository call (the Unit-of-Work convention).
5. **Stay cross-provider.** Both providers are async (libSQL + node-postgres), so one repository body runs
   identically on PostgreSQL and SQLite. Avoid driver-specific column types/SQL; when unavoidable, branch
   on `resolveProvider()` / `isPostgres()` and test both.
6. **Never edit a committed migration.** Add a new one. Schema changes always ship a migration.
7. **Relative imports need explicit `.js` extensions** (strict `NodeNext` in `tsconfig.base.json`),
   e.g. `from './providers/registry.js'`. Omitting the extension fails `typecheck`.
8. **No behavior without a test.** Add/extend a `*.spec.ts` in the same change.
9. **Run the gate:** `pnpm --filter server test && pnpm --filter server typecheck && pnpm --filter server lint`.

## Procedure: Add a Drizzle entity (table)

1. Create `apps/server/src/database/schema/<entity>.ts`. Take the active provider's tools + compose a base set:
   ```ts
   import { getActiveProvider } from '../providers/registry.js';
   import { baseEntityColumns } from './columns.js'; // or baseColumns for append-only tables
   import { auditTableExtras } from './audit.js';
   import { users } from './users.js';

   const { table, columnKit, index } = getActiveProvider();

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
2. Export it from the schema barrel (`apps/server/src/database/schema/index.ts`) and add relations if needed.
3. Generate the migration: `pnpm db:generate` (writes to `src/database/migrations/<provider>/`; the script
   runs drizzle-kit under `tsx` because the schema imports the provider registry via NodeNext `.js`, which
   drizzle-kit's own loader can't resolve). Never edit it after commit.
4. If the column types differ per provider, author the canonical (SQLite) `ColumnKit` shape and have the
   non-canonical provider's kit cast its real builders to it — keep two variants ONLY where required.
5. Add the repository in the owning server module (`controller → service → repository → DatabaseService`)
   by extending `BaseRepository<typeof widgets>` and injecting `DatabaseService`; scope every user-owned
   query with `scopedToUser(userId)` (admin bypass). Register it as a NestJS provider.
6. Tests: schema round-trip, soft-delete hides rows, `user_id` scoping, prefix applied. Run the gate.

## Procedure: Alter an existing table (add/rename/drop column, index, constraint)

1. Edit the schema file via the provider's `table` creator (keep TSDoc current).
2. `pnpm db:generate` to produce a NEW migration; do not touch existing migrations.
3. Verify the generated SQL for BOTH providers (`src/database/migrations/postgres` and `.../sqlite`).
4. Update/extend repository methods and their tests. Run the gate.

## Procedure: Add a NEW database provider (Open/Closed — GUD-008 / PAT-009)

> For the full step-by-step (driver install, every provider file, `connect`/`DbConnection`, env, tests,
> plan sync), use the dedicated **add-database-dialect** skill. The condensed steps below are the summary.

Each database is a self-contained folder under `apps/server/src/database/providers/<name>/` implementing
the `ProviderModule` contract. To add e.g. MySQL with **no changes to existing schema files,
repositories, or common code**:

1. **Create the folder** `apps/server/src/database/providers/mysql/` with the same files as `sqlite/`:
   - `table.ts` — `mysqlTableCreator((name) => `${tablePrefix()}${name}`)`.
   - `column-kit.ts` — a `ColumnKit` over `mysql-core`, returning REAL builders cast to the canonical
     (SQLite-typed) `ColumnKit` (`... as unknown as ColumnKit`), commented.
   - `audit.ts` — audit FK+index helper using `mysql-core` `foreignKey`/`index` (cast to `AuditExtras`).
   - `connection.ts` — `connect(schema): DbConnection` ({ db, disconnect }) via `drizzle-orm/mysql2`.
   - `migrate.ts` — `runMigrator(folder?)`.
   - `index.ts` — assemble `export const mysqlProvider: ProviderModule = { id: 'mysql', table, columnKit, index, auditExtras, connect, runMigrator }`.
2. **Union + register (one line each):** add `'mysql'` to `SupportedProvider` in
   [provider.contract.ts](../../../apps/server/src/database/providers/provider.contract.ts) and one entry
   to `providerRegistry` in [registry.ts](../../../apps/server/src/database/providers/registry.ts). The
   `satisfies Record<SupportedProvider, ProviderModule>` turns a missing impl into a compile error — that
   error IS the guard. NO other file changes.
3. **Migrations folder + drizzle-kit:** create `apps/server/src/database/migrations/mysql/` and add the
   provider's branch (`out` folder + `dialect` string) to the self-contained `apps/server/drizzle.config.ts`
   (it branches on `DB_PROVIDER` inline because drizzle-kit's loader can't import the provider modules).
4. **Tests:** registry has the new entry; `resolveProvider()` returns it for `DB_PROVIDER=mysql`;
   cross-driver persistence (round-trip + prefix + audit FK/index) passes for the new provider.
5. **Update the plan (one edit, all locations)** per the `plan-consistency` instruction's
   "Database provider" row: `CON-001`, `DEP-003`, the `DB_PROVIDER` enum (TASK-003), `GUD-008`,
   `PAT-006`/`PAT-009`, and the phase-0.5 guide.

> **Reality check:** Drizzle ships dialect cores for **PostgreSQL, MySQL/MariaDB, and SQLite only**.
> There is **no SQL Server core** — SQL Server cannot be implemented with Drizzle (it would need a
> different ORM or raw SQL). MariaDB is covered by `mysql-core`.

## Naming & config reference

- `getActiveProvider()` (from `providers/registry.ts`) returns the active `ProviderModule` — the single
  source for `table`, `columnKit`, `index`, `auditExtras`, `connect`, `runMigrator`.
- `ProviderModule` + `ColumnKit` are defined in `providers/provider.contract.ts`; per-provider impls live
  in `providers/<name>/`. Common code (schema, connection, migrate) never branches on the driver
  inline (GUD-011); `apps/server/drizzle.config.ts` is the one self-contained exception.
- The Drizzle client is owned by `DatabaseService` (`database.service.ts`): `OnModuleInit` opens the
  provider connection (`connectDb()` → `provider.connect(schema)` returning `{ db, disconnect }`),
  `OnModuleDestroy` closes it. Repositories inject `DatabaseService` and read `db` lazily. `createDb()`
  (client only, no lifecycle) exists for tests/tools.
- `DB_PROVIDER` (`postgres` | `sqlite`, default `sqlite`) selects the active provider at runtime.
- `DB_TABLE_PREFIX` (default empty) is prepended to every table name by the provider's creator.
- `DB_SCHEMA` (default `public`) targets a Postgres schema; ignored on SQLite.
- Read these lazily via `common/env.ts` getters, never as module-level constants, so tests can vary them.

## Done checklist

- [ ] All tables created via the active provider's `table` creator; no bare names.
- [ ] Entity columns built via `columnKit` (no raw `sqlite-core`/`pg-core` builders); one definition per entity.
- [ ] Cross-provider safe (or branched on `getActiveProvider()`/`isPostgres()` + tested).
- [ ] New migration added; no committed migration edited.
- [ ] Relative imports use `.js`; barrel updated.
- [ ] Tests added; gate green (`pnpm --filter server test && typecheck && lint`).
- [ ] Plan updated if a provider/entity/env var changed (plan-consistency).
