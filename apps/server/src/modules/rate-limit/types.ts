/** A rate-limit window kind. */
export type RateWindow = 'rpm' | 'rpd' | 'tpm' | 'tpd';

/** Identifies the counter bucket a request belongs to. */
export interface CounterScope {
  userId: number;
  providerId: number;
  modelId: number;
  keyId: number;
}

/** Per-key rate caps; an undefined window means "no cap on that window". */
export interface RateCaps {
  rpm?: number;
  rpd?: number;
  tpm?: number;
  tpd?: number;
}

/** Window durations in milliseconds. */
export const WINDOW_MS: Record<RateWindow, number> = {
  rpm: 60_000,
  rpd: 86_400_000,
  tpm: 60_000,
  tpd: 86_400_000,
};
