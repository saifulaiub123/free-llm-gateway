/**
 * Test double for SvelteKit's `$app/environment` virtual module.
 *
 * `browser = false` keeps the runes stores from touching `localStorage` under the Node test
 * environment, so unit tests need no jsdom while still exercising the real store logic.
 */
export const browser = false;
export const dev = false;
export const building = false;
export const version = 'test';
