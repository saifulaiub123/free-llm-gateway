/**
 * Schema barrel for `@gateway/db`.
 *
 * Entities are authored ONCE via the active dialect's `ColumnKit` (PAT-009) and aggregated here so
 * the connection factory can type its Drizzle client against them. More entities are added per phase.
 */
export { users } from './users.js';
export { refreshTokens } from './refresh-tokens.js';
export { apiTokens } from './api-tokens.js';
export { providers } from './providers.js';
export { userProviderKeys } from './user-provider-keys.js';
export { models } from './models.js';
export { userModels } from './user-models.js';
export { rateLimitCounters } from './rate-limit-counters.js';
export { cooldowns } from './cooldowns.js';
export { modelRuntimeStats } from './model-runtime-stats.js';
export { routingStrategies } from './routing-strategies.js';
export { strategyModelOrder } from './strategy-model-order.js';
