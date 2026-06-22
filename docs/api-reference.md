# API reference

The server exposes two HTTP surfaces. Interactive OpenAPI docs are served live:

- **Management API** — `http://localhost:5001/api/docs` (JWT bearer scheme).
- **Gateway API** — `http://localhost:5001/v1/docs` (`sqr-llm-` token scheme).

> **Envelope:** every `/api/v1` response is wrapped in `{ "data": … }`. The `/v1` gateway is
> wire-compatible with OpenAI and is **not** wrapped.

---

## Management API — `/api/v1` (JWT)

Authenticate with `Authorization: Bearer <accessToken>`. Obtain tokens from the auth endpoints.

### Auth

| Method & path | Body | Response (`data`) |
|---------------|------|-------------------|
| `POST /api/v1/auth/register` | `{ email, password }` | `{ accessToken, refreshToken }` |
| `POST /api/v1/auth/login` | `{ email, password }` | `{ accessToken, refreshToken }` |
| `POST /api/v1/auth/refresh` | `{ refreshToken }` | `{ accessToken, refreshToken }` (rotated) |
| `POST /api/v1/auth/logout` | `{ refreshToken }` | `{ revoked: true }` |

### Providers & keys

| Method & path | Notes |
|---------------|-------|
| `GET /api/v1/providers` | Global provider catalog. |
| `POST /api/v1/providers/:providerKey/keys` | `{ apiKey, label? }` — validated upstream before storage. |
| `GET /api/v1/providers/keys` | The caller's stored keys (metadata only, never the ciphertext). |
| `DELETE /api/v1/providers/keys/:id` | Remove a key. |

### Models

| Method & path | Notes |
|---------------|-------|
| `POST /api/v1/providers/keys/:keyId/fetch-models` | Discover + upsert a key's models; free ones are enabled. |
| `GET /api/v1/models` | The caller's models (catalog + custom). |
| `PATCH /api/v1/models/:userModelId` | `{ enabled?, overrides? }`. |
| `POST /api/v1/models/custom` | Add a custom model. |
| `DELETE /api/v1/models/custom/:id` | Remove a custom model. |

### Strategies

| Method & path | Notes |
|---------------|-------|
| `GET /api/v1/strategies` | List strategies. |
| `POST /api/v1/strategies` | `{ type, name, config? }`. |
| `PATCH /api/v1/strategies/:id` | Rename / update config. |
| `PUT /api/v1/strategies/:id/order` | `{ items: [{ userModelId, position, enabled? }] }` (Manual fixed order). |
| `PATCH /api/v1/strategies/:id/config` | `{ config }` (weights / manual sub-mode). |
| `PUT /api/v1/strategies/:id/default` | Make this the default strategy. |

### Tokens, analytics & logs

| Method & path | Notes |
|---------------|-------|
| `POST /api/v1/tokens` | `{ name }` → `{ token, prefix }` (plaintext shown once). |
| `GET /api/v1/tokens` | Token metadata (no hashes). |
| `DELETE /api/v1/tokens/:id` | Revoke a token. |
| `GET /api/v1/analytics/summary?window=24h\|7d\|30d` | `{ window, requests, successRate, avgLatencyMs, totalTokens, totalCostSaved }`. |
| `GET /api/v1/analytics/by-provider?window=…` | Per-provider usage rows. |
| `GET /api/v1/logs?cursor=&limit=` | Paginated request logs (keyset). |

---

## Gateway API — `/v1` (OpenAI-compatible)

Authenticate with `Authorization: Bearer sqr-llm-…`. Responses are raw OpenAI shapes (no envelope).

### `GET /v1/models`

Lists the caller's enabled models in OpenAI list shape:

```json
{ "object": "list", "data": [{ "id": "llama-3.3-70b", "object": "model", "owned_by": "groq" }] }
```

### `POST /v1/chat/completions`

Standard OpenAI request body. Use `"model": "auto"` to let the router pick, or pin an explicit model
id. Optional `X-Routing-Strategy` header overrides the default strategy. Set `"stream": true` for an
SSE stream (terminated by `data: [DONE]`).

```bash
curl http://localhost:5001/v1/chat/completions \
  -H "Authorization: Bearer sqr-llm-…" \
  -H "Content-Type: application/json" \
  -d '{ "model": "auto", "messages": [{ "role": "user", "content": "Hello!" }] }'
```

Responses include routing telemetry headers:

| Header | Meaning |
|--------|---------|
| `X-Routed-Via` | `<provider>/<model>` that served the request. |
| `X-Fallback-Attempts` | Number of earlier candidates skipped before success (omitted when `0`). |

Error cases: `401` (missing/invalid token or a JWT), `422 no_capable_model` (no enabled model
satisfies the request's capabilities), `503` (every candidate failed).
