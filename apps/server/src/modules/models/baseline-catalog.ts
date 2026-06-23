/**
 * Curated baseline metadata for well-known models (TASK-032).
 *
 * WHY a baseline: adapters report cost/capabilities but not an intelligence score or speed tier, yet
 * the auto-strategies (Smart/Balanced) need something to sort on the moment a model is discovered.
 * This table seeds sensible starting values that runtime stats later refine. Updating it is a
 * one-file change. Lookup is tolerant of provider prefixes (e.g. `meta/llama-3.1-8b-instruct`).
 */

/** Starting intelligence/speed metadata for a model. */
export interface ModelBaseline {
  /** Rough capability score, 0..100. */
  intelligenceScore: number;
  /** Relative latency tier. */
  speedTier: 'slow' | 'medium' | 'fast';
}

/** Applied when a model id has no curated baseline. */
export const DEFAULT_BASELINE: ModelBaseline = { intelligenceScore: 50, speedTier: 'medium' };

/** Curated baselines keyed by the bare model id (provider prefix stripped). */
export const MODEL_BASELINE: Record<string, ModelBaseline> = {
  'llama-3.3-70b-instruct': { intelligenceScore: 74, speedTier: 'fast' },
  'llama-3.1-8b-instruct': { intelligenceScore: 55, speedTier: 'fast' },
  'deepseek-r1': { intelligenceScore: 82, speedTier: 'slow' },
  'deepseek-v3': { intelligenceScore: 80, speedTier: 'medium' },
  'qwen2.5-72b-instruct': { intelligenceScore: 72, speedTier: 'medium' },
  'mixtral-8x7b': { intelligenceScore: 62, speedTier: 'fast' },
  'gemini-2.0-flash': { intelligenceScore: 70, speedTier: 'fast' },
  'gemini-1.5-flash': { intelligenceScore: 64, speedTier: 'fast' },
  'gemini-1.5-pro': { intelligenceScore: 78, speedTier: 'medium' },
};
