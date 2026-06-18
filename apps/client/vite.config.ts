import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

/**
 * Vite config for the SvelteKit client.
 *
 * WHY the Tailwind v4 plugin: Tailwind v4 is configured via the Vite plugin + a single
 * `@import "tailwindcss";` in `app.css`, with no `tailwind.config.js` needed for the base setup.
 */
export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
});
