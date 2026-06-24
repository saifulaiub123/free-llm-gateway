/** The routing strategy kinds (matches `routing_strategies.type`). */
export type StrategyType = 'manual' | 'free_first' | 'balanced' | 'fastest' | 'smart';

/** Manual strategy sub-modes: a fixed saved order, or live sort by one metric. */
export type ManualMode = 'fixed' | 'stability' | 'rate_limit' | 'latency' | 'cost';

/**
 * Everything a strategy needs to rank a `(model, provider, key)` option.
 *
 * WHY a flat value object with no DB access: strategies are pure sorters (Strategy pattern) — all the
 * live signals are resolved upstream (by the candidate loader + the in-memory rate-limit / cooldown /
 * runtime-stats services) so `order()` stays deterministic and trivially testable.
 */
export interface RoutingCandidate {
  userModelId: number;
  modelId: number;
  /** Upstream-facing model name (e.g. "gemini-2.0-flash"), used to override `model: "auto"` before the adapter call. */
  upstreamModelId: string;
  providerKey: string;
  keyId: number;
  isFree: boolean;
  /** Blended in+out cost estimate per 1M tokens. */
  costPer1m: number;
  /** Curated/refined capability score, 0..100. */
  intelligenceScore: number;
  /** Measured average latency (ms) from runtime stats, or a speed-tier fallback. */
  measuredLatencyMs: number;
  /** Rolling success rate, 0..1. */
  stability: number;
  /** Healthy key AND not in cooldown. */
  available: boolean;
  /** Fraction of rate-limit caps remaining, 0..1. */
  rateLimitHeadroom: number;
  /** Context-window size of the model (# tokens). Null when unknown (let upstream decide). */
  contextWindow: number | null;
  /** Capability flags used by `ChainFilter` to honor request requirements. */
  capabilities: { vision: boolean; tools: boolean; json: boolean };
  /** Saved manual position for `Manual.fixed`. */
  position: number;
}

/** Per-dimension weights for the Balanced strategy (each blended on a 0..1 scale). */
export interface StrategyWeights {
  cost: number;
  intelligence: number;
  speed: number;
  stability: number;
  rateLimit: number;
  availability: number;
}

/** Tunable per-strategy configuration persisted as JSON in `routing_strategies.config`. */
export interface StrategyConfig {
  manualMode?: ManualMode;
  weights?: StrategyWeights;
  capabilityFilter?: Partial<{ vision: boolean; tools: boolean; json: boolean }>;
}

/** Capabilities a specific request requires (drives `ChainFilter`). */
export interface RequestCapabilities {
  vision?: boolean;
  tools?: boolean;
  json?: boolean;
  /** Estimated input tokens from the messages array. Null when not computed (skips window check). */
  estimatedInputTokens?: number;
}

/** Balanced-strategy default weights (sum to 1.0) applied when a strategy omits its own. */
export const DEFAULT_WEIGHTS: StrategyWeights = {
  cost: 0.25,
  intelligence: 0.2,
  speed: 0.15,
  stability: 0.2,
  rateLimit: 0.1,
  availability: 0.1,
};
