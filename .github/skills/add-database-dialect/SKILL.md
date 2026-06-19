---
name: add-database-dialect
description: 'Add a NEW pluggable relational database provider to the Free LLM Gateway database layer (apps/server/src/database, any database with a Drizzle ORM core). USE WHEN: adding MySQL or MariaDB (mysql-core) support; adding SingleStore (singlestore-core) or another Drizzle-supported engine; creating a new providers/<name>/ folder; implementing the ProviderModule contract for a new driver; registering a provider in providerRegistry; wiring a new DB_PROVIDER value end-to-end. Keywords: add database, new provider, pluggable database, ProviderModule, ColumnKit, providerRegistry, SupportedProvider, getActiveProvider, DatabaseService, connect, DbConnection, mysql, mariadb, mysql-core, singlestore, drizzle core, new DB driver, runMigrator, providers folder, DB_PROVIDER, drizzle.config branch, cross-driver. NOTE: there is no SQL Server / MSSQL core in Drizzle, so SQL Server cannot be added this way.'
---

# Add a New Database Provider (`apps/server/src/database`)

Load this skill to add a brand-new relational database to the gateway's **pluggable provider layer**.
Each database is one self-contained folder under `apps/server/src/database/providers/<name>/` implementing
the `ProviderModule` contract (PAT-009). Adding one is **a new folder + one registry line + one config
branch**, with zero changes to existing schema files or repositories (Open/Closed — GUD-008/GUD-011).

> For routine schema/entity/migration work (not a new provider) use the **database-changes** skill
> instead. Always obey `AGENTS.md` §6 and the `plan-consistency` instruction.

## Reality check FIRST (do this before anything else)

Drizzle ORM ships relational dialect cores for **PostgreSQL (`pg-core`), MySQL/MariaDB
(`mysql-core`), and SQLite (`sqlite-core`)** — plus SingleStore (`singlestore-core`) and Gel. There
is **NO SQL Server / MSSQL core**, so SQL Server cannot be added with Drizzle.

Confirm the target database has BOTH:
1. A Drizzle dialect core (`drizzle-orm/<engine>-core`), and
2. A Node driver + Drizzle adapter (`drizzle-orm/<adapter>`), e.g. MySQL → `mysql2` +
   `drizzle-orm/mysql2`.

If either is missing, stop — it is not pluggable via this pattern.

## The contract you must satisfy

`apps/server/src/database/providers/provider.contract.ts` defines the canonical surface every provider implements:

```ts
export interface ProviderModule {
  readonly id: SupportedProvider;                // your new provider literal
  readonly table: TableCreator;                  // prefix-applying table creator (canonical type)
  readonly columnKit: ColumnKit;                 // pk/createdAt/timestamp/boolean/integer/text
  readonly index: IndexFn;                        // table-level index builder
  auditExtras(tableName, audit, usersId): AuditExtras; // createdBy/modifiedBy FK + indexes
  connect(schema: Schema): DbConnection;         // open { db, disconnect } (schema passed IN)
  runMigrator(migrationsFolder?: string): Promise<void>;
}
```

**Canonical typing rule:** `ColumnKit`, `TableCreator`, `IndexFn`, and `AuditExtras` are typed against
the **SQLite** builders (the reference provider, async via libSQL). Your new provider returns its REAL
`<engine>-core` builders **cast** to those types (`... as unknown as ColumnKit`). The runtime objects
are genuine builders (so `drizzle-kit` emits correct DDL); the cast only aligns the compile-time surface
so the single `schema/` authored against the kit type-checks. Inferred row types match across providers
(Date / boolean / number / string), so repositories stay type-safe. Mirror exactly what
`apps/server/src/database/providers/postgres/` does.

**Async + DbConnection rule:** all providers are async (libSQL, node-postgres, mysql2 are all
awaitable), so one repository body runs everywhere. `connect(schema)` returns a `DbConnection`
(`{ db, disconnect }`) — the `disconnect` closure closes the underlying driver handle so
`DatabaseService.onModuleDestroy` can shut down cleanly.

**Import-cycle rule:** a provider folder MUST NOT import the `schema/` barrel. `connect(schema)`
takes the schema as a parameter (the common `connection.ts` passes it in).

## Procedure (worked example: MySQL / MariaDB)

Replace `mysql` / `mysql2` / `mysql-core` with your engine's equivalents throughout. Mirror the
existing `providers/sqlite/` (reference, fully typed) and `providers/postgres/` (cast pattern) folders.

### 1. Install the driver

Add the Node driver to `apps/server/package.json` dependencies (Drizzle core ships with `drizzle-orm`):
```jsonc
"dependencies": { "mysql2": "^3.11.0" }            // + "@types/*" if the driver needs them
```
Run `pnpm install`. Pin a Node version that has prebuilt binaries if the driver is native.

### 2. Create the provider folder `apps/server/src/database/providers/mysql/`

Create these files (all relative imports need explicit `.js` extensions — strict NodeNext):

**`paths.ts`** — URL resolution (no file default for a server DB):
```ts
import { dbUrl } from '../../common/env.js';
export const resolveMysqlUrl = (): string => dbUrl() ?? '';
```

**`table.ts`** — prefix-applying creator, cast to the canonical `TableCreator`:
```ts
import { mysqlTableCreator } from 'drizzle-orm/mysql-core';
import type { TableCreator } from '../provider.contract.js';
import { tablePrefix } from '../../common/env.js';

export const mysqlTable = mysqlTableCreator((name) => `${tablePrefix()}${name}`) as unknown as TableCreator;
```

**`column-kit.ts`** — semantic primitives over `mysql-core`, cast to the canonical `ColumnKit`:
```ts
import { boolean, int, text, timestamp } from 'drizzle-orm/mysql-core';
import type { ColumnKit } from '../provider.contract.js';

/** Real mysql-core builders cast to the canonical (SQLite-typed) ColumnKit. See postgres for WHY. */
export const mysqlColumnKit = {
  pk: (name = 'id') => int(name).autoincrement().primaryKey(),
  createdAt: (name = 'created_at') => timestamp(name).notNull().defaultNow(),
  timestamp: (name: string) => timestamp(name),
  boolean: (name: string) => boolean(name),
  integer: (name: string) => int(name),
  text: <T extends string>(name: string, config?: { enum: readonly [T, ...T[]] }) =>
    config ? text(name, config) : text(name),
} as unknown as ColumnKit;
```

**`audit.ts`** — FK + index helper; params/return use the canonical shapes, columns cast to the
engine column type (mirror `dialects/postgres/audit.ts`):
```ts
import { foreignKey, index, type AnyMySqlColumn } from 'drizzle-orm/mysql-core';
import type { AnySQLiteColumn } from 'drizzle-orm/sqlite-core';
import type { AuditExtras, AuditOwnershipColumns } from '../sqlite/audit.js';

export function mysqlAuditTableExtras(
  tableName: string,
  audit: AuditOwnershipColumns,
  usersId: AnySQLiteColumn,
): AuditExtras {
  const createdBy = audit.createdBy as unknown as AnyMySqlColumn;
  const modifiedBy = audit.modifiedBy as unknown as AnyMySqlColumn;
  const ref = usersId as unknown as AnyMySqlColumn;
  return {
    createdByFk: foreignKey({ columns: [createdBy], foreignColumns: [ref], name: `${tableName}_created_by_fk` }).onDelete('set null'),
    modifiedByFk: foreignKey({ columns: [modifiedBy], foreignColumns: [ref], name: `${tableName}_modified_by_fk` }).onDelete('set null'),
    createdByIdx: index(`${tableName}_created_by_idx`).on(createdBy),
    modifiedByIdx: index(`${tableName}_modified_by_idx`).on(modifiedBy),
  } as unknown as AuditExtras;
}
```

**`connection.ts`** — build the client; `schema` is a parameter (no schema-barrel import):
```ts
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import type { Db, DbConnection, Schema } from '../../types.js';
import { resolveMysqlUrl } from './paths.js';

export const connectMysql = (schema: Schema): DbConnection => {
  const pool = mysql.createPool(resolveMysqlUrl());
  // Cast to the canonical libSQL-typed `Db`: mysql2 shares the async query-builder surface (PAT-009).
  const db = drizzle(pool, { schema, mode: 'default' }) as unknown as Db; // mysql2 requires a `mode`
  return { db, disconnect: async () => { await pool.end(); } };
};
```

**`migrate.ts`** — `runMigrator(folder?)` with its own short-lived connection:
```ts
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import mysql from 'mysql2/promise';
import { resolveMysqlUrl } from './paths.js';

const defaultMigrationsFolder = (): string =>
  fileURLToPath(new URL('../../migrations/mysql', import.meta.url));

export const runMysqlMigrator = async (migrationsFolder?: string): Promise<void> => {
  const pool = mysql.createPool(resolveMysqlUrl());
  try {
    await migrate(drizzle(pool, { mode: 'default' }), { migrationsFolder: migrationsFolder ?? defaultMigrationsFolder() });
  } finally {
    await pool.end();
  }
};
```
> If the engine has schemas/databases that must pre-exist (like Postgres' `CREATE SCHEMA IF NOT
> EXISTS`), add that step before `migrate(...)` using `dbSchema()` from `common/env.js`.

**`index.ts`** — assemble the module (cast `index` like postgres does):
```ts
import { index as mysqlIndex } from 'drizzle-orm/mysql-core';
import type { ProviderModule, IndexFn } from '../provider.contract.js';
import { mysqlTable } from './table.js';
import { mysqlColumnKit } from './column-kit.js';
import { mysqlAuditTableExtras } from './audit.js';
import { connectMysql } from './connection.js';
import { runMysqlMigrator } from './migrate.js';

export const mysqlProvider: ProviderModule = {
  id: 'mysql',
  table: mysqlTable,
  columnKit: mysqlColumnKit,
  index: mysqlIndex as unknown as IndexFn,
  auditExtras: mysqlAuditTableExtras,
  connect: connectMysql,
  runMigrator: runMysqlMigrator,
};
```

### 3. No `Db` type change — the canonical single type stays

`Db = LibSQLDatabase<Schema>` is the **single canonical** async client type (libSQL is the reference).
Your `connect()` builds the real `<engine>` Drizzle client and casts it to `Db` at the boundary
(`... as unknown as Db`, shown in `connection.ts` above) — exactly like postgres. There is no union to
widen, so `types.ts` is untouched.

### 4. Widen the union + register (one line each) — the Open/Closed guard

`apps/server/src/database/providers/provider.contract.ts`:
```ts
export type SupportedProvider = 'sqlite' | 'postgres' | 'mysql';
```
`apps/server/src/database/providers/registry.ts`:
```ts
import { mysqlProvider } from './mysql/index.js';
export const providerRegistry = {
  sqlite: sqliteProvider,
  postgres: postgresProvider,
  mysql: mysqlProvider,
} satisfies Record<SupportedProvider, ProviderModule>;
```
The `satisfies Record<SupportedProvider, ProviderModule>` makes a missing module a **compile error** —
that error is the guard. NO other existing file changes.

### 5. drizzle-kit config branch — `apps/server/drizzle.config.ts`

`drizzle.config.ts` is intentionally **self-contained** (it branches on `DB_PROVIDER` inline) because
drizzle-kit's loader cannot resolve NodeNext `.js` imports through the provider modules. Add the new
branch for `out` + `dialect` (drizzle-kit's own `dialect` config key):
```ts
const provider = process.env.DB_PROVIDER ?? 'sqlite';
const out = provider === 'postgres' ? './src/database/migrations/postgres'
          : provider === 'mysql' ? './src/database/migrations/mysql'
          : './src/database/migrations/sqlite';
const dialect = provider === 'postgres' ? 'postgresql' : provider === 'mysql' ? 'mysql' : 'sqlite';
```
Keep the `out` value in sync with the provider's `migrate.ts` `defaultMigrationsFolder()`.

### 6. Migrations folder

Create `apps/server/src/database/migrations/mysql/` (commit a `.gitkeep` if empty).

### 7. Env wiring (server)

- `apps/server/src/config/env.schema.ts`: add the value to the `DB_PROVIDER` enum
  (`z.enum(['postgres', 'sqlite', 'mysql'])`).
- `.env.example`: document the new `DB_PROVIDER` value + the `DB_URL` format for the engine.

## Tests (same change)

Add/extend specs (Vitest), mirroring the existing dialect specs:
- `providers/registry.spec.ts` — the registry has the new entry; `resolveProvider()` returns it for
  `DB_PROVIDER=mysql`; `getActiveProvider().id` matches.
- `providers/mysql/table.spec.ts` — `DB_TABLE_PREFIX` is applied.
- Cross-driver persistence (round-trip + audit FK/index). If the engine needs a running server
  (MySQL/Postgres do), either keep it **compile/typecheck-only** for now (like Postgres) or add a
  CI service container. State which in the task notes.

## Gate

```bash
pnpm --filter server test && pnpm --filter server typecheck && pnpm --filter server lint
DB_PROVIDER=mysql pnpm --filter server db:generate   # emits engine DDL (manual; db:generate runs under tsx)
```

## Plan / docs sync (required — plan-consistency "Database provider" row)

Update in ONE pass: `CON-001`, `DEP-003`, the `DB_DRIVER` enum (TASK-003), `GUD-008`/`GUD-011`,
`PAT-006`/`PAT-009`, `FILE-002` in `plan/feature-free-llm-gateway-1.md`; the phase-0.5 guide; and add
a `TASK-0XX` row (appended, never renumbered) marked complete with the date.

## Done checklist

- [ ] Driver installed; `connect()` casts the client to the canonical `Db` (no union to widen).
- [ ] `providers/<name>/` folder implements the full `ProviderModule` (table, column-kit, audit, index, connection, migrate, index.ts).
- [ ] Real `<engine>-core` builders cast to canonical types; provider folder does NOT import `schema/`.
- [ ] `SupportedProvider` widened + `providerRegistry` line added (`satisfies` compiles).
- [ ] `drizzle.config.ts` branch + `migrations/<name>/` folder + `DB_PROVIDER` enum + `.env.example`.
- [ ] Tests added; gate green; `DB_PROVIDER=<name> db:generate` emits DDL.
- [ ] Plan/spec/guide synced (plan-consistency).
