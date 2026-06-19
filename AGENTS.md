# AGENTS.md — Free LLM Gateway

> Always-on engineering rules for **every** agent and **every** task in this repository.
> These rules are mandatory and take precedence over personal style. If a change would
> violate a rule, stop and reconsider the approach instead of breaking the rule.

This repository is a **self-hosted, free-first, multi-user LLM routing gateway**: an
OpenAI-compatible `/v1` endpoint that aggregates many providers' free tiers and routes
each request through a configurable, metric-driven fallback chain. See the full plan in
[`../feature-free-llm-gateway-1.md`](../feature-free-llm-gateway-1.md) and the step-by-step
build guides in [`../implementation/`](../implementation/README.md).

---

## 1. Tech Stack (do not deviate)

- **Language**: TypeScript (strict mode). No JavaScript source files.
- **Server**: NestJS 10+ (modules, providers, DI).
- **ORM**: Drizzle ORM. Pluggable drivers: PostgreSQL (`pg`) and SQLite (`better-sqlite3`).
- **Client**: SvelteKit 2 + Svelte 5 (runes) + Tailwind CSS v4.
- **Identity**: first-party NestJS auth using `@nestjs/passport`, `passport-jwt`, `@nestjs/jwt`, `argon2`. No managed identity provider.
- **Tests**: Vitest (server, adapters, packages). Supertest for HTTP integration.
- **Monorepo**: pnpm workspaces + Turborepo.

Do not introduce a new framework, ORM, or HTTP client without an entry in the plan's
Alternatives section and explicit human approval.

---

## 2. Project Structure

```
apps/
  server/    NestJS API (management /api/v1 + gateway /v1)
  client/    SvelteKit dashboard
packages/
  db/                 Drizzle schema, table factory, connection factory, migrations
  shared-types/       DTOs shared between server and client
  provider-adapters/  Base + per-provider adapter classes + AdapterRegistry
```

- **Server module layout**: `apps/server/src/modules/<feature>/` with thin controllers,
  services for business logic, repositories for persistence. Cross-cutting concerns live in
  `apps/server/src/common/` (guards, interceptors, filters, decorators, crypto).
- **Dependency direction is one-way**: `controller → service → repository → db`.
  Never call the DB from a controller. Never put business logic in a controller.

---

## 3. Architecture Rules (SOLID / SoC / SRP)

- **SRP**: one class = one reason to change. If a class does filtering *and* ordering *and*
  execution, split it (`ChainFilter`, `ChainOrderer`, `FallbackExecutor`).
- **Open/Closed**:
  - Adding a **provider** = new adapter subclass + `AdapterRegistry` entry + one catalog seed
    row. The router/core MUST NOT change.
  - Adding a **routing strategy** = new strategy class + factory entry. Existing strategies
    MUST NOT change.
- **Strategy pattern** for routing (`IRoutingStrategy` + `RoutingStrategyFactory`).
- **Template Method / inheritance** for adapters (`BaseLlmProviderAdapter` →
  `OpenAiCompatibleAdapter` → concrete providers; special providers extend the base directly).
- **Repository pattern** over Drizzle. Services never write raw Drizzle queries inline if a
  repository method can own them.
- **Dependency Injection** everywhere (NestJS providers). No `new` of a service inside another
  service; inject it.

---

## 4. Code Quality Rules (enforced in review and CI)

- **Small units**: functions ≤ ~40 lines, files ≤ ~300 lines (lint-enforced). Extract helpers
  when exceeded.
- **Intention-revealing names**: no abbreviations (`ratelimit` not `rl`, `provider` not `prov`).
  Methods are verbs (`buildChain`, `classifyFreeModels`); classes are nouns (`ChainOrderer`).
- **Comments are mandatory**: every exported class and public method has a TSDoc block, and any
  non-obvious logic has an inline comment explaining **why** (not what). See §8.
- **No `any`** unless unavoidable and justified with a comment. Prefer precise types and
  `unknown` + narrowing.
- **Errors are typed and handled at boundaries**: throw domain errors in services; map to HTTP
  in a global exception filter. Do not swallow errors silently.
- **No secrets in code or logs**: provider keys, tokens, and `ENCRYPTION_KEY` must never be
  logged or returned in responses/errors.
- **Document every endpoint**: each controller method has `@ApiOperation` + `@ApiResponse`, each
  DTO uses `@ApiProperty`, and each controller has `@ApiTags`. Management routes are documented at
  `/api/docs` (JWT scheme); gateway routes at `/v1/docs` (`sqr-llm-` token scheme). An endpoint
  without Swagger decorators is not done.

---

## 5. Security Rules (non-negotiable)

- Provider API keys: **AES-256-GCM** encrypted at rest via `EncryptionService`; decrypt only in
  memory immediately before an upstream call.
- LLM API tokens and refresh tokens: store **SHA-256 hashes only**; show plaintext exactly once.
- Passwords: **Argon2id**.
- **Two separate auth guards, never merged**: `JwtAuthGuard` protects `/api/v1`;
  `LlmApiTokenGuard` protects `/v1`. `/v1` rejects JWTs; `/api/v1` rejects LLM API tokens.
- **Every** user-owned query is scoped by `user_id`. Cross-user access returns `403` unless the
  caller has the `admin` role.
- Validate all input at the boundary (DTOs / zod). Apply CORS. Document HTTPS for deployment.

---

## 6. Database Rules

- Each database is a self-contained **dialect module** under `packages/db/src/dialects/<name>/`
  implementing the `DialectModule` contract (table creator, `ColumnKit`, audit helper, connection,
  migrator, drizzle-kit config). Entities create tables via `getActiveDialect().table` (prefix +
  `DB_SCHEMA` applied) — never hand-write a bare table name. Common code (schema, connection, migrate,
  config) MUST NOT branch on the driver inline; it resolves through `getActiveDialect()` (GUD-008/011, PAT-009).
- Every table composes the shared **base-column sets** from `packages/db/src/schema/columns.ts`
  (built once from the active dialect's `ColumnKit`): `baseColumns` = `id`/`createdAt` on all tables;
  `baseEntityColumns` adds `createdBy`/`modifiedBy`/`modifiedAt`/`isActive`/`isDeleted` on user-facing
  domain entities. Never re-declare `id`/`createdAt` by hand, and author entity columns via `columnKit.*`
  (never raw `sqlite-core`/`pg-core` builders) so one definition serves every dialect.
- Foreign keys and indexes are declared, not implied: every FK column carries a real `FOREIGN KEY`
  plus an index. `createdBy`/`modifiedBy` reference `users.id` (`ON DELETE SET NULL`) via the
  `auditTableExtras` helper; owning `*_id` FKs cascade. Add composite indexes for hot scoped lookups.
- All persistence goes through a repository extending the generic **`BaseRepository<TTable>`**
  (`apps/server/src/common/db/base.repository.ts`), which centralizes soft-delete filtering,
  `user_id` scoping (`scopedToUser`), and optional-`tx` support. Multi-write operations are wrapped
  in `db.transaction(tx => ...)` (the Unit-of-Work convention; Drizzle has no change tracking).
- Code must run identically on every supported dialect. Adding a database = one new `dialects/<name>/`
  folder + one `dialectRegistry` line, with zero changes to existing schema/repositories. Avoid driver-
  specific SQL; when unavoidable, branch on `getActiveDialect()`/`isPostgres()` and cover both in tests.
  NOTE: Drizzle supports PostgreSQL, MySQL/MariaDB, and SQLite — NOT SQL Server.
- Schema changes require a Drizzle migration. Never edit a committed migration; add a new one.

---

## 7. Testing Rules

- **Every** task that adds behavior ships with tests in the same change. No behavior without a test.
- Layers:
  - **Unit**: adapters (`fetchModels`, `classifyFreeModels`), routing strategies (`order`),
    `ChainFilter`, `EncryptionService`, services with mocked repositories.
  - **Integration**: HTTP endpoints via Supertest against an in-memory SQLite DB.
  - **Cross-driver**: critical persistence paths run against both SQLite and PostgreSQL.
- A change is "done" only when: `pnpm lint`, `pnpm typecheck`, and `pnpm test` all pass.
- Test names describe behavior: `it('rejects a JWT on the /v1 gateway', ...)`.

---

## 8. Commenting Standard (example)

```ts
/**
 * Orders routing candidates for the "Balanced" strategy.
 *
 * WHY: free-tier capacity is the primary cost lever, but always picking the single
 * cheapest model starves on rate limits. We therefore blend cost, intelligence,
 * speed, stability, availability, and remaining rate-limit headroom into one score
 * so no single dimension dominates. Weights come from user settings.
 */
export class BalancedStrategy implements IRoutingStrategy {
  /**
   * @param candidates Pre-filtered, callable candidates (already passed ChainFilter).
   * @param config Per-strategy weights and capability filters.
   * @returns Candidates sorted best-first by the weighted score.
   */
  order(candidates: RoutingCandidate[], config: StrategyConfig): RoutingCandidate[] {
    // ...
  }
}
```

---

## 9. Build & Test Commands

```bash
pnpm install                 # install workspace deps
pnpm dev                     # run server + client in watch mode
pnpm --filter server test    # server unit + integration tests
pnpm --filter @gateway/provider-adapters test
pnpm lint                    # ESLint (max-lines / complexity enforced)
pnpm typecheck               # tsc --noEmit, strict
pnpm db:generate             # generate Drizzle migration from schema
pnpm db:migrate              # apply migrations
```

---

## 10. Definition of Done (every task)

1. Code follows §3–§6 (architecture, quality, security, DB rules).
2. TSDoc + WHY comments present (§8).
3. Tests added and `pnpm lint && pnpm typecheck && pnpm test` pass (§7).
4. The corresponding `TASK-XXX` row in [`../feature-free-llm-gateway-1.md`](../feature-free-llm-gateway-1.md)
   is marked complete with the date.
5. No secret material in code, logs, or responses.

## 11. Continuous Learning (keep skills & plans true)

Whenever reality diverges from what a skill, instruction, or plan doc says — the user corrects an
approach, you change a plan `.md`, a documented step fails, or you hit a fault/gotcha it did not warn
about — load the **`learn-from-changes-and-faults`** skill and propagate the learning back into every
related skill, instruction, plan row/guide, `AGENTS.md` rule, and `/memories/` note (then grep the old
value to confirm no stale references). The FILES are the source of truth; never let a fix live only in
chat. Surface conflicts with always-on rules before overriding; never persist secrets.
