import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

/**
 * Vitest config for the NestJS server.
 *
 * WHY the SWC plugin: NestJS dependency injection relies on `emitDecoratorMetadata`, which the
 * default esbuild transformer does NOT emit. SWC (with legacy decorators + decorator metadata)
 * reproduces what `tsc`/`nest build` emit, so providers resolve correctly under test.
 */
export default defineConfig({
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
