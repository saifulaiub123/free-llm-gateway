/**
 * Client configuration.
 *
 * `API_BASE` targets the management API (`/api/v1`). The OpenAI-compatible `/v1` gateway is only
 * called by external LLM clients, never by this dashboard. Override via `VITE_API_BASE` per
 * environment; the default matches the server's configured dev `PORT`.
 */
export const API_BASE = import.meta.env.VITE_API_BASE ?? '/api/v1';

/**
 * Base URL of the OpenAI-compatible gateway (`/v1`), derived from {@link API_BASE} by swapping the
 * `/api/v1` management prefix for `/v1`. Used ONLY by the Playground, which sends a test chat with an
 * LLM API token (not the JWT) exactly as an external client would.
 */
export const GATEWAY_BASE = API_BASE.replace(/\/api\/v1\/?$/, '') + '/v1';

