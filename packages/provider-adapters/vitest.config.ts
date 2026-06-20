import { defineConfig } from 'vitest/config';

/**
 * Vitest config for the provider-adapters package.
 *
 * No SWC plugin needed: the package is framework-agnostic (no NestJS decorators), so the default
 * esbuild transform is sufficient. Tests mock `fetch` to assert discovery/classification logic.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
});
