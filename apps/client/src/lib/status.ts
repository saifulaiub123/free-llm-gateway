import type { KeyStatus } from './api/types';

/** Maps a provider-key health status to a {@link Badge} tone. */
export function keyStatusTone(status: KeyStatus): 'success' | 'warning' | 'danger' | 'neutral' {
  switch (status) {
    case 'healthy':
      return 'success';
    case 'rate_limited':
      return 'warning';
    case 'invalid':
    case 'error':
      return 'danger';
    default:
      return 'neutral';
  }
}

/** Human-readable label for a provider-key status. */
export function keyStatusLabel(status: KeyStatus): string {
  return status.replace('_', ' ');
}
