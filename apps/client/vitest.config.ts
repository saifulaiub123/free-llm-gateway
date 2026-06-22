import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Vitest config for the client.
 *
 * WHY the `svelte()` plugin: it compiles `.svelte.ts` rune modules (the auth store) so they can be
 * unit-tested. SvelteKit's virtual `$app/*` modules don't exist outside the dev/build pipeline, so
 * `$app/environment` is aliased to a small test double (`browser = false`), which keeps the stores
 * off `localStorage` and lets tests run in the plain Node environment.
 */
export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      '$app/environment': fileURLToPath(
        new URL('./src/test/app-environment.mock.ts', import.meta.url),
      ),
    },
  },
  test: {
    include: ['src/**/*.spec.ts'],
    environment: 'node',
  },
});
