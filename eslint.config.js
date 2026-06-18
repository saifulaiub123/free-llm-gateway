// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

/**
 * Shared flat ESLint config for the whole monorepo.
 *
 * WHY these rules: AGENTS.md mandates small, single-purpose units. `max-lines`,
 * `max-lines-per-function`, and `complexity` mechanically enforce that, and
 * `no-explicit-any` keeps the codebase strictly typed. `eslint-config-prettier`
 * is last so formatting concerns never conflict with lint.
 */
export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/.svelte-kit/**',
      '**/node_modules/**',
      '**/coverage/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 60, skipBlankLines: true, skipComments: true }],
      complexity: ['error', 12],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: ['**/*.config.{js,ts}', '**/*.cjs', '**/*.mjs'],
    rules: {
      'max-lines-per-function': 'off',
    },
  },
  prettier,
);
