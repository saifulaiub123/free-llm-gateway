import type { RoutingCandidate, StrategyConfig, StrategyType } from '../types/routing-candidate.js';

/**
 * Strategy pattern: each routing strategy is a pure sorter over already-filtered candidates.
 *
 * WHY pure (no DB, no side effects): ordering is deterministic and trivially testable, and adding a
 * strategy is a new class + one factory entry with the others untouched (Open/Closed).
 */
export interface IRoutingStrategy {
  /** The strategy type this implementation handles (matches `routing_strategies.type`). */
  readonly type: StrategyType;
  /** Returns the candidates ordered best-first for this strategy. */
  order(candidates: RoutingCandidate[], config: StrategyConfig): RoutingCandidate[];
}
