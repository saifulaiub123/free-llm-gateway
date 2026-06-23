import { fileURLToPath } from 'node:url';
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

/**
 * Vitest config for the NestJS server.
 *
 * WHY the SWC plugin: NestJS dependency injection relies on `emitDecoratorMetadata`, which the
 * default esbuild transformer does NOT emit. SWC (with legacy decorators + decorator metadata)
 * reproduces what `tsc`/`nest build` emit, so providers resolve correctly under test.
 *
 * WHY the workspace aliases: Vitest/Vite does not read tsconfig `paths`, so the `@gateway/*` source
 * packages must be aliased to their entry files for the test module graph to resolve them (the runtime
 * resolves them via the pnpm node_modules symlinks instead).
 */
export default defineConfig({
  resolve: {
    alias: {
      '@gateway/provider-adapters': fileURLToPath(
        new URL('../../packages/provider-adapters/src/index.ts', import.meta.url),
      ),
      '@gateway/shared-types': fileURLToPath(
        new URL('../../packages/shared-types/src/index.ts', import.meta.url),
      ),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts', 'test/**/*.e2e-spec.ts'],
    setupFiles: ['./test/setup-env.ts'],
  },
  plugins: [
    swc.vite({
      jsc: {
        target: 'es2022',
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
      },
    }),
  ],
});
