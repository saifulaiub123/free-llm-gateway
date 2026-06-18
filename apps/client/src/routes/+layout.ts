/**
 * Root layout options — forces SPA mode.
 *
 * WHY `ssr = false`: the dashboard is a per-user, auth-gated app with no SEO requirement, so it
 * renders entirely in the browser. `prerender = false` because all routes depend on runtime auth.
 */
export const ssr = false;
export const prerender = false;
