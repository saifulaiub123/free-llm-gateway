/**
 * Schema barrel for `@gateway/db`.
 *
 * Entities are authored ONCE via the active dialect's `ColumnKit` (PAT-009) and aggregated here so
 * the connection factory can type its Drizzle client against them. More entities are added per phase.
 */
export { users } from './users.js';
export { refreshTokens } from './refresh-tokens.js';
