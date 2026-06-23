/**
 * Inverse normalization of an unbounded "lower-is-better" metric into `(0, 1]`.
 *
 * WHY: cost and latency are unbounded while scores are 0..1, so the Balanced strategy would let one
 * term swamp the others without normalizing. `invNorm(0) = 1` (best) and decays toward 0 as the value
 * grows, so cheaper/faster candidates score higher. Negative inputs are clamped to 0.
 */
export const invNorm = (value: number): number => 1 / (1 + Math.max(0, value));
