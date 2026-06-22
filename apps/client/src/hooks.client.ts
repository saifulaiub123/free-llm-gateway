import { goto } from '$app/navigation';
import type { HandleClientError } from '@sveltejs/kit';
import { authStore } from '$lib/stores/auth.svelte';

// Restore any persisted session as soon as the SPA boots (before the first route guard runs).
authStore.init();

/**
 * Last-resort client error handler (SPA — there is no `hooks.server.ts`).
 *
 * WHY redirect on auth failure here: if a load/guard throws because the session expired, send the
 * user to `/login` rather than showing a raw error. Per-route guards in the `(app)` layout handle the
 * common unauthenticated case proactively.
 */
export const handleError: HandleClientError = ({ error }) => {
  const message = error instanceof Error ? error.message : 'Unexpected error';
  if (!authStore.isAuthenticated) {
    void goto('/login');
  }
  return { message };
};
