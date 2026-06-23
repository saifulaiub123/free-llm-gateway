import { API_BASE } from '../config';
import { authStore } from '../stores/auth.svelte';
import { ApiError, parseErrorMessage } from './error';

/** HTTP verbs the typed clients use. */
type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

interface RequestOptions {
  method?: Method;
  /** JSON body; serialized automatically. */
  body?: unknown;
  /** Query parameters; `undefined` values are skipped. */
  query?: Record<string, string | number | undefined>;
}

/** Builds a path + querystring from a record, omitting `undefined` values. */
function withQuery(path: string, query?: RequestOptions['query']): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

/**
 * Thin typed fetch wrapper for the management API (`/api/v1`).
 *
 * WHY centralize here: every page gets JWT attachment, a single transparent token refresh + retry on
 * a 401, the `{ data }` envelope unwrap, and consistent {@link ApiError} throwing — so route code
 * never touches token lifecycle or response shape plumbing.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = `${API_BASE}${withQuery(path, options.query)}`;
  const run = (token: string | null): Promise<Response> =>
    fetch(url, {
      method: options.method ?? 'GET',
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    });

  let response = await run(authStore.accessToken);
  if (response.status === 401 && (await authStore.tryRefresh())) {
    response = await run(authStore.accessToken);
  }

  const text = await response.text();
  if (!response.ok) {
    throw new ApiError(response.status, parseErrorMessage(text));
  }
  // Management responses are wrapped in `{ data: ... }`; an empty body (rare) yields `undefined`.
  return text ? (JSON.parse(text) as { data: T }).data : (undefined as T);
}
