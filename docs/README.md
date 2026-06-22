# Documentation

Documentation for the Free LLM Gateway.

## Contents

- [Configuration](./configuration.md) — environment variables and database setup.
- [Architecture](./architecture.md) — modules, routing engine, provider adapters, request flow.
- [Routing strategies](./routing-strategies.md) — Manual sub-modes + Balanced/Smart/Fastest/Free-First.
- [Security model](./security.md) — encryption, hashed tokens, the two auth guards, per-user isolation.
- [API reference](./api-reference.md) — `/api/v1` (management) and `/v1` (OpenAI-compatible) with examples.
- [Adding a provider adapter](./adding-a-provider.md) — contributor guide.

Live OpenAPI docs are served by a running server at `/api/docs` (management) and `/v1/docs` (gateway).
