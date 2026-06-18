# Architecture

> Skeleton — expanded as features land. See the [implementation plan](../plan/) for full detail.

## Overview

```
apps/
  server/   NestJS API — management (/api/v1, JWT) + OpenAI-compatible gateway (/v1, LLM token)
  client/   SvelteKit SPA dashboard (calls /api/v1 only)
packages/
  db/                 Drizzle schema + pluggable connection (Postgres/SQLite) + migrations
  shared-types/       DTOs shared between server and client
  provider-adapters/  Provider adapter hierarchy + registry
```

## Key principles

- **Dependency direction:** `controller → service → repository → db`. One-way; no DB access in controllers.
- **Open/Closed:** new provider = adapter subclass + registry entry + seed row; new routing strategy = strategy class + factory entry; new DB dialect = table-factory registry entry. Core untouched.
- **Two auth surfaces:** JWT guards `/api/v1`; hashed `sqr-llm-` tokens guard `/v1`. Never merged.

## Topics (to be documented)

- Routing engine: `ChainFilter` → `ChainOrderer` → `FallbackExecutor`.
- Provider adapters: `BaseLlmProviderAdapter` → `OpenAiCompatibleAdapter` → concrete providers.
- Rate-limit ledger, cooldowns, and runtime stats.
- Security model: AES-256-GCM key encryption, token hashing, refresh-token rotation.
