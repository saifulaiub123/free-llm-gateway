# Free LLM Gateway

A self-hosted, free-first, multi-user LLM routing gateway: an **OpenAI-compatible `/v1` endpoint**
that aggregates many providers' free tiers and routes each request through a configurable,
metric-driven fallback chain — exhausting free capacity before touching paid models.

> Status: in active development (Phase 0 — scaffolding). See [plan](./plan/) for the roadmap.

## Tech stack

- **Server:** NestJS 10 (TypeScript, strict) — management API at `/api/v1`, OpenAI-compatible gateway at `/v1`.
- **Database:** Drizzle ORM with pluggable **PostgreSQL** and **SQLite** drivers.
- **Client:** SvelteKit 2 + Svelte 5 (runes) + Tailwind CSS v4, built as an SPA with Bits UI and a switchable theme system.
- **Monorepo:** pnpm workspaces + Turborepo.

## Prerequisites

- **Node.js 22 LTS** (see [`.nvmrc`](./.nvmrc) — run `nvm use`). Native modules (`@libsql/client`) ship prebuilds for LTS lines.
- **pnpm 9** (`corepack enable`).
- **Docker** (optional, for the container quick start).

## Quick start — Docker

```bash
cp .env.example .env          # then fill in ENCRYPTION_KEY + JWT secrets
docker compose up --build     # gateway on http://localhost:5001
```

With PostgreSQL instead of SQLite:

```bash
# set DB_PROVIDER=postgres and DB_URL in .env, then:
docker compose --profile postgres up --build
```

## Quick start — local development

```bash
corepack enable
pnpm install
cp .env.example apps/server/.env   # fill in ENCRYPTION_KEY + JWT secrets
pnpm dev                            # runs server + client in watch mode
```

- Server: http://localhost:5001 — health at `/api/v1/health`, docs at `/api/docs` and `/v1/docs`.
- Client (dev): http://localhost:5173

Generate an `ENCRYPTION_KEY`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Environment

All server configuration is environment-driven and validated at boot (the server refuses to start
on missing/invalid required vars). See [`.env.example`](./.env.example) for the full list; the
required ones are `ENCRYPTION_KEY`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`.

## Workspace scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Run server + client in watch mode |
| `pnpm build` | Build all packages |
| `pnpm lint` | ESLint across the workspace |
| `pnpm typecheck` | Strict `tsc` typecheck |
| `pnpm test` | Run all package tests |
| `pnpm db:generate` | Generate a Drizzle migration |
| `pnpm db:migrate` | Apply migrations |

## Project structure

```
apps/
  server/   NestJS API (management /api/v1 + gateway /v1)
  client/   SvelteKit SPA dashboard
packages/
  db/                 Drizzle schema, table factory, connection factory, migrations
  shared-types/       DTOs shared between server and client
  provider-adapters/  Base + per-provider adapter classes + registry
docker/     Dockerfile
docs/       Documentation
```

## Documentation

See [`docs/`](./docs/README.md) for configuration, architecture, and contributor guides.