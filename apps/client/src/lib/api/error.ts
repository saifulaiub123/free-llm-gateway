/**
 * Error thrown by {@link apiFetch} when the management API returns a non-2xx response.
 *
 * WHY a typed error carrying the status + parsed message: pages can branch on `status` (e.g. show a
 * 400 validation message inline) without re-parsing the response body.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Extracts a human-readable message from a NestJS error body (`{ message }`) or raw text. */
export function parseErrorMessage(body: string): string {
  try {
    const parsed = JSON.parse(body) as { message?: string | string[]; error?: string };
    if (Array.isArray(parsed.message)) {
      return parsed.message.join(', ');
    }
    return parsed.message ?? parsed.error ?? body;
  } catch {
    return body || 'Request failed';
  }
}
