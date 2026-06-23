import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '../lib/api/client';
import { ApiError } from '../lib/api/error';
import { authStore } from '../lib/stores/auth.svelte';

/** Builds a JSON `Response` for the global `fetch` mock. */
function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('apiFetch (TASK-057)', () => {
  beforeEach(() => {
    authStore.accessToken = 'expired';
    authStore.refreshToken = 'refresh-1';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('refreshes once on a 401 and retries the original request with the new token', async () => {
    const fetchMock = vi.fn((url: string, init: RequestInit) => {
      if (url.endsWith('/auth/refresh')) {
        return Promise.resolve(
          jsonResponse(200, { data: { accessToken: 'fresh', refreshToken: 'refresh-2' } }),
        );
      }
      const auth = (init.headers as Record<string, string>).authorization;
      return Promise.resolve(
        auth === 'Bearer fresh'
          ? jsonResponse(200, { data: { ok: true } })
          : jsonResponse(401, { message: 'unauthorized' }),
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await apiFetch<{ ok: boolean }>('/models');

    expect(result).toEqual({ ok: true });
    expect(authStore.accessToken).toBe('fresh');
    // original (401) + refresh + retry = 3 calls
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('throws ApiError carrying the status and parsed message on a non-OK response', async () => {
    authStore.refreshToken = null; // no refresh path for a 400
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse(400, { message: 'bad input' }))),
    );

    await expect(apiFetch('/models')).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      message: 'bad input',
    });
    await expect(apiFetch('/models')).rejects.toBeInstanceOf(ApiError);
  });

  it('unwraps the `{ data }` envelope', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse(200, { data: [1, 2, 3] }))),
    );
    expect(await apiFetch<number[]>('/tokens')).toEqual([1, 2, 3]);
  });
});
