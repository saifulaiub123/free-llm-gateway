---
description: "Use when editing the Free LLM Gateway plan docs (plan/feature-free-llm-gateway-1.md and plan/1.Base/phase-*.md): adding or changing a provider, routing strategy, Drizzle entity, endpoint, or env var. Enforces keeping every cross-referenced enumeration (TASK/REQ/SEC/DEP/FILE rows, seed lists, registries, phase guides) in sync."
name: "Plan Doc Consistency"
applyTo: "plan/**/*.md"
---
# Plan Doc Consistency

The plan is split across the spec ([feature-free-llm-gateway-1.md](../../plan/feature-free-llm-gateway-1.md))
and per-phase guides ([plan/1.Base/](../../plan/1.Base/)). The **same fact is enumerated in
multiple places**. When you change one, update every matching location in the **same edit** —
a partial edit leaves the plan inconsistent and is incomplete.

## Always update every place an item is enumerated

Before finishing, grep the plan for the old value and confirm no stale reference remains.

| When you add/change a... | Update in the spec | Update in the phase guides |
|---|---|---|
| **Provider** | TASK-018 seed list, TASK-023 adapter list, DEP-009, FILE-004 | phase-2 seed row, phase-2 TASK-023 adapter list + example, phase-2 AdapterRegistry, phase-2 tests |
| **Routing strategy** | REQ-009/011, TASK-042/043, PAT-001, FILE-011 | phase-5 strategy class, RoutingStrategyFactory, tests |
| **Drizzle entity** | matching TASK row, FILE-002 schema list, GUD-009/010 (base cols + FK/index) | owning phase guide schema (author via `getActiveDialect()` `table`/`columnKit`/`index`, compose base columns + `auditTableExtras`) + repository + tests |
| **Base columns / repository** | PAT-003/007/008, GUD-009/010, TASK-066/067, FILE-002, FILE-005 | `schema/columns.ts` kit factories (`makeBaseColumns`/`makeBaseEntityColumns`) + phase-1 examples + `database-changes` skill |
| **Database dialect** | CON-001, DEP-003, TASK-003 `DB_DRIVER` enum, GUD-008/011, PAT-006/009, FILE-002, TASK-068–071 | new `src/dialects/<name>/` folder (table/column-kit/audit/connection/migrate/config/index) + one `dialectRegistry` line + `migrations/<name>/` + phase-0.5 guide + `database-changes` skill (no SQL Server — Drizzle has no mssql core) |
| **Endpoint** | matching TASK row, REQ row, TEST row | owning phase guide controller + Swagger + tests |
| **Env var** | TASK-003 env schema | phase-0 config + `.env.example` (TASK-008) |

## Rules

- **One edit, all locations.** Never update the spec table without the corresponding phase guide (and vice versa).
- **Keep ordering consistent.** List items (e.g. provider names, adapter classes) appear in the same order across rows; insert new entries in the same position everywhere.
- **Mirror the established shape.** Copy the exact column/field set of neighboring entries (e.g. a new provider seed row uses the same keys as existing rows; a new adapter follows the existing example).
- **Preserve traceability.** Every new TASK references its REQ/SEC/CON, and every new behavior has a matching TEST row — the plan's REQ→TASK→TEST chain must stay complete.
- **Respect Open/Closed framing.** Provider/strategy additions must be described as "new class + registry/factory entry + seed row, core untouched" — do not introduce edits to the router/core in the plan text.
- **Never renumber.** Append new TASK-XXX/REQ-XXX/TEST-XXX ids; do not reuse or shift existing ids.

## Architecture Rules (SOLID / SoC / SRP)

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

## Code Quality Rules (enforced in review and CI)

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
  without Swagger decorators is not don

## Security Rules (non-negotiable)

- Provider API keys: **AES-256-GCM** encrypted at rest via `EncryptionService`; decrypt only in
  memory immediately before an upstream call.
- LLM API tokens and refresh tokens: store **SHA-256 hashes only**; show plaintext exactly once.
- Passwords: **Argon2id**.
- **Two separate auth guards, never merged**: `JwtAuthGuard` protects `/api/v1`;
  `LlmApiTokenGuard` protects `/v1`. `/v1` rejects JWTs; `/api/v1` rejects LLM API tokens.
- **Every** user-owned query is scoped by `user_id`. Cross-user access returns `403` unless the
  caller has the `admin` role.
- Validate all input at the boundary (DTOs / zod). Apply CORS. Document HTTPS for deployment.

## Database Rules

- All tables are declared via the **table factory** in `packages/db` so the configurable
  `DB_TABLE_PREFIX` and `DB_SCHEMA` are applied consistently. Never hand-write a bare table name.
- Code must run identically on PostgreSQL and SQLite. Avoid driver-specific SQL; when unavoidable,
  branch on `DB_DRIVER` and cover both in tests.
- Schema changes require a Drizzle migration. Never edit a committed migration; add a new one.

---

## Testing Rules

- **Every** task that adds behavior ships with tests in the same change. No behavior without a test.
- Layers:
  - **Unit**: adapters (`fetchModels`, `classifyFreeModels`), routing strategies (`order`),
    `ChainFilter`, `EncryptionService`, services with mocked repositories.
  - **Integration**: HTTP endpoints via Supertest against an in-memory SQLite DB.
  - **Cross-driver**: critical persistence paths run against both SQLite and PostgreSQL.
- A change is "done" only when: `pnpm lint`, `pnpm typecheck`, and `pnpm test` all pass.
- Test names describe behavior: `it('rejects a JWT on the /v1 gateway', ...)`.

---

## Commenting Standard (example)

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
---

## Quick check before finishing

1. Grep the changed term across `plan/**/*.md`; every hit reflects the new value.
2. The spec table row and its phase-guide section agree (names, order, fields).
3. A new capability has both a TASK and a TEST entry.
