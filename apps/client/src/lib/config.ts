/**
 * Client configuration.
 *
 * `API_BASE` targets the management API (`/api/v1`). The OpenAI-compatible `/v1` gateway is only
 * called by external LLM clients, never by this dashboard. Override via `VITE_API_BASE` per
 * environment; the default matches the server's configured dev `PORT`.
 */
export const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:5001/api/v1';
