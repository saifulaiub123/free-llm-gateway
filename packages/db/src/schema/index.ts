/**
 * Schema barrel for `@gateway/db`.
 *
 * Drizzle entities are added starting in Phase 1 (`users`, `refresh_tokens`,
 * `api_tokens`, `providers`, ...). It is intentionally empty for now so the
 * connection factory can type its Drizzle client against the (currently empty)
 * schema without a circular dependency.
 */
export {};
