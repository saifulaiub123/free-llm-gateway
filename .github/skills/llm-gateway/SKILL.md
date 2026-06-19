---
name: llm-gateway
description: 'Implement, extend, fix, or review the Free LLM Gateway (NestJS + Drizzle + SvelteKit). USE FOR: adding a provider adapter; adding/editing a routing strategy; adding a Drizzle entity/migration; building a NestJS module/controller/service/guard; gateway /v1 chat-completions or /v1/models work; rate-limit/cooldown logic; SvelteKit client pages; writing tests for any of these. Keywords: LLM gateway, provider adapter, BaseLlmProviderAdapter, AdapterRegistry, routing strategy, IRoutingStrategy, ChainFilter, ChainOrderer, FallbackExecutor, fetch free models, classifyFreeModels, /v1/chat/completions, X-Routed-Via, LlmApiTokenGuard, JwtAuthGuard, Drizzle table factory, DB_SCHEMA, DB_TABLE_PREFIX, refresh token, EncryptionService.'
---

# Free LLM Gateway — Implementation Skill

Load this skill before doing any work in the Free LLM Gateway repo. It encodes the exact,
tested workflow for each kind of task so that any agent produces consistent, mergeable code.

**Always obey [`../AGENTS.md`](../AGENTS.md) (or the repo's `AGENTS.md`) first.** This skill
adds task-specific procedures on top of those always-on rules.

## Before You Start (every task)

1. Read the task row (`TASK-XXX`) in [`../feature-free-llm-gateway-1.md`](../feature-free-llm-gateway-1.md).
2. Open the matching phase guide in [`../implementation/`](../implementation/README.md) and follow its steps.
3. Identify the layer you are touching: `controller → service → repository → db`, adapter, or strategy.
4. Plan the test first (unit and/or integration). No behavior ships without a test.

## Procedure: Add a Provider Adapter

1. Create `packages/provider-adapters/src/providers/<provider>.adapter.ts`.
2. Extend `OpenAiCompatibleAdapter` if the provider is OpenAI-wire-compatible; otherwise extend
   `BaseLlmProviderAdapter` directly (e.g. Gemini, HuggingFace).
3. Override **only** what differs — usually `fetchModels(key)` and `classifyFreeModels(models)`.
   Free-detection is provider-specific (OpenRouter = price 0; HuggingFace = curated list; etc.).
4. Register it in `AdapterRegistry` keyed by the provider `key`.
5. Add a provider catalog seed row in `packages/db` (provider only — never seed models).
6. Tests (Vitest, mocked HTTP): `validateKey`, `fetchModels` shape, `classifyFreeModels` correctness.
7. Do **not** modify the router, gateway, or other adapters.

See [`../implementation/phase-2-providers-adapters.md`](../implementation/phase-2-providers-adapters.md).

## Procedure: Add / Edit a Routing Strategy

1. Create `apps/server/src/modules/routing/strategies/<name>.strategy.ts` implementing
   `IRoutingStrategy.order(candidates, config)`.
2. Register it in `RoutingStrategyFactory`. Do not touch existing strategy classes.
3. Order using `RoutingCandidate` live signals only (is_free, cost, intelligence, latency,
   stability, availability, rate_limit_headroom). Read tunable weights/criteria from `config`.
4. Tests: feed crafted candidate sets and assert the resulting order for each branch
   (including Manual fixed order and each sort-by-single-metric sub-mode).

See [`../implementation/phase-5-routing.md`](../implementation/phase-5-routing.md).

## Procedure: Add a Drizzle Entity + Migration

1. Define the table in `packages/db/src/schema/<entity>.ts` authored ONCE via `getActiveDialect()`
   (`table`/`columnKit`/`index`) so `DB_TABLE_PREFIX` + `DB_SCHEMA` apply and one definition serves
   every dialect. Never hand-write a bare name or raw `sqlite-core`/`pg-core` builders. See the
   **database-changes** skill for the full entity recipe.
2. Export it from the schema barrel and add any relations.
3. Run `pnpm db:generate` to produce a migration; never edit a committed migration.
4. Ensure it works on both SQLite and PostgreSQL (the kit guarantees this; avoid driver-specific SQL).
5. Add the repository in the owning module by extending `BaseRepository<typeof entity>`; register it
   as a NestJS provider.

See [`../implementation/phase-0-scaffolding.md`](../implementation/phase-0-scaffolding.md).

## Procedure: Add a NestJS Module / Endpoint

1. `apps/server/src/modules/<feature>/`: `*.controller.ts` (thin), `*.service.ts` (logic),
   `*.repository.ts` (persistence), `dto/` (validated input), `*.module.ts`.
2. Management endpoints mount under `api/v1` and use `JwtAuthGuard`. Gateway endpoints mount under
   `v1` (excluded from the global prefix) and use `LlmApiTokenGuard`. Never mix the two guards.
3. Scope every user-owned query by `user_id` (admin bypass via `RolesGuard`).
4. Document the endpoint: add `@ApiTags` to the controller, `@ApiOperation` + `@ApiResponse` to
   each method, and `@ApiProperty` to every DTO field. Management routes appear in `/api/docs`,
   gateway routes in `/v1/docs`. Undocumented endpoints fail review (GUD-007).
5. Tests: unit-test the service with a mocked repository; integration-test the controller via
   Supertest against in-memory SQLite.

See [`../implementation/phase-1-identity.md`](../implementation/phase-1-identity.md) for the canonical module example.

## Procedure: Gateway `/v1` Work

1. Resolve strategy from `X-Routing-Strategy` header or the user's default.
2. `RoutingService.buildChain(...)` → `FallbackExecutor` runs the attempt loop.
3. On `429`/`5xx`/timeout: cooldown the key, increment attempts, try next; stop at
   `MAX_FALLBACK_ATTEMPTS`.
4. Always emit `X-Routed-Via: <provider>/<model>` and, on fallback, `X-Fallback-Attempts: <N>`.
5. Honor `model: "auto"` (router picks) and explicit model ids (pin to provider).

See [`../implementation/phase-6-gateway.md`](../implementation/phase-6-gateway.md).

## Procedure: SvelteKit Client Page

1. Follow the `sveltekit-svelte5-tailwind` skill (runes, `load`, form actions).
2. Call the typed clients in `src/lib/api/` (they target `/api/v1` with the JWT).
3. Keep components small and presentational; data-loading lives in `+page.ts`/`+page.server.ts`.

See [`../implementation/phase-8-client.md`](../implementation/phase-8-client.md).

## Done Checklist

- [ ] Layer boundaries respected (controller→service→repository→db); no logic in controllers.
- [ ] Open/Closed honored (new provider/strategy added without editing the core).
- [ ] TSDoc + WHY comments present.
- [ ] Tests added; `pnpm lint && pnpm typecheck && pnpm test` green.
- [ ] No secrets in code/logs/responses.
- [ ] `TASK-XXX` marked complete in the plan.
