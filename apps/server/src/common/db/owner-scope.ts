import { eq, type AnyColumn, type SQL } from 'drizzle-orm';
import type { CurrentUser } from '../../modules/auth/auth.types.js';

/**
 * Returns a `where` predicate that limits rows to the caller — unless they are an admin.
 *
 * WHY a single helper: per-user data isolation (SEC-004) must be enforced identically everywhere, so
 * every repository derives its ownership filter from THIS function rather than hand-writing the check.
 * Admins bypass the filter (`undefined` = no predicate) to support cross-user administration.
 *
 * @param user The authenticated principal (id + role) attached by an auth guard.
 * @param userIdColumn The `user_id` column of the table being queried.
 * @returns `eq(userIdColumn, user.id)` for a regular user, or `undefined` (no filter) for an admin.
 */
export function ownerScope(user: CurrentUser, userIdColumn: AnyColumn): SQL | undefined {
  return user.role === 'admin' ? undefined : eq(userIdColumn, user.id);
}
