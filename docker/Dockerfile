# syntax=docker/dockerfile:1
# Multi-stage build for the Free LLM Gateway.
# Builds the SvelteKit client to a static SPA and runs the NestJS server (via @swc-node/register).

ARG NODE_VERSION=22.15.0

# --- Base: Node + pnpm via Corepack -----------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

# --- Dependencies: install with the workspace manifests for caching ---------
# WHY the build toolchain: the libSQL / pg native modules may need to compile; python3/make/g++ let
# them build if no prebuilt binary is available for this platform.
FROM base AS deps
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY apps/server/package.json ./apps/server/package.json
COPY apps/client/package.json ./apps/client/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json
COPY packages/provider-adapters/package.json ./packages/provider-adapters/package.json
RUN pnpm install --frozen-lockfile

# --- Build: copy source and build the client SPA ----------------------------
FROM deps AS build
COPY . .
RUN pnpm --filter client build

# --- Runtime: run the API server --------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production
# Absolute path to the built client SPA, served by the server in production.
ENV CLIENT_DIST_PATH=/app/apps/client/build
COPY --from=build /app ./
# SQLite database persistence (used when DB_PROVIDER=sqlite).
VOLUME ["/app/apps/server/data"]
EXPOSE 5001
WORKDIR /app/apps/server
# Run pending Drizzle migrations at container startup, then boot the server.
# WHY auto-migrate: in container orchestration (Dokploy, Docker Compose, K8s) the DB schema
# must be up-to-date before the first request arrives, and a separate migration step is easy
# to forget. The server runs via @swc-node/register (TypeScript + emitDecoratorMetadata for
# NestJS DI + workspace resolution). tsx/esbuild is NOT used at runtime — it drops decorator
# metadata.
CMD ["pnpm", "start:migrate"]
