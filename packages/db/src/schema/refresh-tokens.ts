import { getActiveDialect } from '../dialects/registry.js';
import { baseColumns } from './columns.js';
import { users } from './users.js';

const { table, columnKit, index } = getActiveDialect();

/**
 * Persisted refresh tokens (hashed) backing JWT session rotation.
 *
 * WHY hashed + family: only the SHA-256 hash is stored so a DB leak cannot mint sessions; `familyId`
 * groups every rotation of one login, so replay of an already-rotated token can revoke the whole
 * family (token-reuse detection). Uses `baseColumns` only — its own `revokedAt`/`expiresAt` lifecycle
 * replaces soft delete. `userId` cascades so a user's tokens are removed with the user.
 */
export const refreshTokens = table(
  'refresh_tokens',
  {
    ...baseColumns,
    userId: columnKit
      .integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: columnKit.text('token_hash').notNull().unique(),
    familyId: columnKit.text('family_id').notNull(),
    expiresAt: columnKit.timestamp('expires_at').notNull(),
    revokedAt: columnKit.timestamp('revoked_at'),
    replacedByTokenId: columnKit.integer('replaced_by_token_id'),
    createdByIp: columnKit.text('created_by_ip'),
    userAgent: columnKit.text('user_agent'),
  },
  (t) => ({
    userIdIdx: index('refresh_tokens_user_id_idx').on(t.userId),
    familyIdIdx: index('refresh_tokens_family_id_idx').on(t.familyId),
  }),
);
