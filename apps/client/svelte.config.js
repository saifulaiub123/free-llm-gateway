import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/**
 * SvelteKit configuration.
 *
 * WHY adapter-static (SPA): the dashboard lives entirely behind auth, is per-user, and needs no
 * SEO, so server rendering adds cost without benefit. `fallback` makes every route resolve to a
 * single shell that hydrates and routes client-side, and the static output is served directly by
 * the NestJS server (TASK-008) — no second Node process.
 */
/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({ fallback: '200.html' }),
  },
};

export default config;
