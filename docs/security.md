# Security model

The gateway stores third-party provider keys and issues its own credentials, so its security model
is deliberately strict. This page summarizes the guarantees and where they are enforced.

## Secrets at rest

| Secret | Storage | Mechanism |
|--------|---------|-----------|
| Provider API keys | `user_provider_keys.encrypted_key` | **AES-256-GCM** via `EncryptionService`, keyed by `ENCRYPTION_KEY`. Decrypted only in memory immediately before an upstream call. |
| LLM API tokens (`sqr-llm-…`) | `api_tokens.token_hash` | **SHA-256 hash only**. The plaintext is shown exactly once at creation and is never retrievable. |
| Refresh tokens | `refresh_tokens.token_hash` | SHA-256 hash, rotated on every use with reuse (replay) detection that revokes the family. |
| Passwords | `users.password_hash` | **Argon2id**. |

> **Back up `ENCRYPTION_KEY`.** Losing it makes every stored provider key unrecoverable. It must be
> 32 bytes of hex (64 characters).

## Two authentication surfaces

The two APIs use separate guards that are **never merged**:

- `JwtAuthGuard` protects the management API `/api/v1`. It accepts only short-lived access JWTs and
  rejects `sqr-llm-` tokens.
- `LlmApiTokenGuard` protects the OpenAI-compatible gateway `/v1`. It accepts only `sqr-llm-` tokens
  (matched by SHA-256 hash) and rejects JWTs **before** any database lookup.

This separation means a leaked gateway token cannot touch account management, and a leaked dashboard
JWT cannot spend provider quota.

## Per-user isolation

Every user-owned query is scoped by `user_id` (`scopedToUser` in the base repository). Cross-user
access returns `403` unless the caller holds the `admin` role. Analytics and logs only ever return
the calling user's rows.

## Transport & input

- All input is validated at the boundary with DTOs (`ValidationPipe` with `whitelist: true`).
- CORS is enabled on the server; restrict the allowed origins for production deployments.
- **Terminate TLS in front of the gateway** (reverse proxy) — provider keys and tokens must never
  travel over plaintext HTTP in production.

## What is never logged or returned

Provider key plaintext, the `ENCRYPTION_KEY`, JWT secrets, and token plaintext are never written to
logs or included in API responses or error bodies.
