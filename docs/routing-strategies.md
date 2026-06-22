# Routing strategies

Every chat request is routed through an ordered **fallback chain** of `(model, provider, key)`
candidates. A **strategy** decides the order; the `FallbackExecutor` then tries candidates top-down,
cooling down any that rate-limit or error until one succeeds.

A request picks its strategy from the `X-Routing-Strategy` header, falling back to the user's default
strategy, then to `balanced`. Manage strategies on the dashboard's **Strategies** page or via
`/api/v1/strategies`.

## Candidate signals

Each candidate carries live signals the strategies sort on:

| Signal | Meaning |
|--------|---------|
| `isFree` / `costPer1m` | Whether the model is free; blended in+out cost per 1M tokens. |
| `intelligenceScore` | Curated capability score (0–100). |
| `measuredLatencyMs` | Rolling average latency from runtime stats. |
| `stability` | Rolling success rate (0–1). |
| `available` | Healthy key **and** not in cooldown. |
| `rateLimitHeadroom` | Fraction of rate-limit capacity remaining (0–1). |
| `capabilities` | `vision` / `tools` / `json` flags used by `ChainFilter`. |

`ChainFilter` first drops candidates that are unavailable or cannot satisfy the request's required
capabilities. If nothing remains, the gateway returns `422 no_capable_model`.

## Strategies

- **Free First** — orders all free, available candidates ahead of paid ones; within a tier, prefers
  higher stability and headroom. The default value lever: exhaust free capacity before paid models.
- **Fastest** — orders by lowest `measuredLatencyMs` (favouring the `fast` speed tier), then stability.
- **Smart** — orders by highest `intelligenceScore`, then stability — best-quality answer first.
- **Balanced** — blends every signal into one weighted score so no single dimension dominates.
  Weights (`cost`, `intelligence`, `speed`, `stability`, `rateLimit`, `availability`) are tunable per
  strategy via `PATCH /api/v1/strategies/:id/config` or the dashboard sliders. Defaults sum to 1.0.
- **Manual** — gives you explicit control via a sub-mode:
  - `fixed` — a saved drag-and-drop order (set on the dashboard, persisted via
    `PUT /api/v1/strategies/:id/order`).
  - `stability` / `rate_limit` / `latency` / `cost` — live sort by that single metric.

## Why blend, not single-pick

Always choosing the single cheapest (or fastest) model starves it on rate limits. Balanced/Smart
spread load across the pool while still honouring your priority, and the cooldown + fallback loop
means a rate-limited candidate is skipped automatically on the next attempt.

See also: [architecture.md](./architecture.md) for the full request flow.
