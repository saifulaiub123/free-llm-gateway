# Configuration

The server is configured entirely through environment variables, validated at boot. See
[`.env.example`](../.env.example) for the authoritative list.

## Required

| Variable | Description |
|----------|-------------|
| `ENCRYPTION_KEY` | 32-byte hex (64 chars). Encrypts provider API keys at rest. **Back this up** — losing it makes stored keys unrecoverable. |
| `JWT_ACCESS_SECRET` | ≥ 32 chars. Signs short-lived access tokens. |
| `JWT_REFRESH_SECRET` | ≥ 32 chars. Signs refresh tokens. |

## Optional (defaults shown)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5001` | HTTP port. |
| `JWT_ACCESS_TTL` | `15m` | Access-token lifetime. |
| `JWT_REFRESH_TTL` | `30d` | Refresh-token lifetime. |
| `DB_PROVIDER` | `sqlite` | `sqlite` or `postgres`. |
| `DB_URL` | `file:./data/llm-gateway.db` | SQLite path or `postgres://` connection string. |
| `DB_SCHEMA` | `public` | PostgreSQL schema (ignored on SQLite). |
| `DB_TABLE_PREFIX` | _(empty)_ | Prepended to every table name (e.g. `lg_`). |
| `MAX_FALLBACK_ATTEMPTS` | `20` | Max providers tried per request. |
| `HEALTH_PROBE_INTERVAL_MS` | `300000` | Key health-probe interval. |

## Database

The gateway runs identically on SQLite (zero-config dev) and PostgreSQL (production). Switch with
`DB_PROVIDER` + `DB_URL`. Generate and apply migrations with `pnpm db:generate` / `pnpm db:migrate`.
