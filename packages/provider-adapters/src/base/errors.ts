/**
 * Raised when an upstream provider returns a non-OK HTTP status.
 *
 * WHY a typed error: the gateway's fallback executor inspects `status` to decide whether to cool the
 * key down and try the next candidate (e.g. `429`/`5xx`) versus surface the error; `body` is retained
 * for logging/diagnostics. Provider key material is never placed in this error.
 */
export class UpstreamError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
  ) {
    super(`Upstream provider error ${status}`);
    this.name = 'UpstreamError';
  }
}
