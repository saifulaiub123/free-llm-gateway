import { getActiveProvider } from '../providers/registry.js';
import { baseEntityColumns } from './columns.js';
import { auditTableExtras } from './audit.js';
import { users } from './users.js';

const { table, columnKit, index } = getActiveProvider();

/**
 * Unified LLM API tokens used by external clients (e.g. ScraperQ) on the `/v1` gateway.
 *
 * Stored as SHA-256 hashes only (`tokenHash`); the plaintext is shown exactly once at creation, with
 * `prefix` (e.g. `sqr-llm-AB12`) kept for display/identification. Separate from JWT/refresh-token
 * auth so the two auth surfaces never overlap (SEC-003). Composes `baseEntityColumns`; `userId`
 * cascades so a user's tokens are removed with the user.
 */
export const apiTokens = table(
  'api_tokens',
  {
    ...baseEntityColumns,
    userId: columnKit
      .integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: columnKit.text('token_hash').notNull().unique(),
    name: columnKit.text('name').notNull(),
    prefix: columnKit.text('prefix').notNull(),
    lastUsedAt: columnKit.timestamp('last_used_at'),
    revoked: columnKit.boolean('revoked').notNull().default(false),
  },
  (t) => ({
    ...auditTableExtras('api_tokens', t, users.id),
    userIdIdx: index('api_tokens_user_id_idx').on(t.userId),
  }),
);
