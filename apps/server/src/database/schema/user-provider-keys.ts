import { getActiveProvider } from '../providers/registry.js';
import { baseEntityColumns } from './columns.js';
import { auditTableExtras } from './audit.js';
import { users } from './users.js';
import { providers } from './providers.js';

const { table, columnKit, index } = getActiveProvider();

/**
 * A user's encrypted credential for a provider (TASK-019).
 *
 * WHY multiple rows per `(user, provider)`: keys form a pool, so the router can fail over across a
 * user's keys for the same provider. The plaintext key is NEVER stored — `encryptedKey` holds the
 * AES-256-GCM ciphertext from `EncryptionService`. `status` is maintained by the health probe so the
 * router can skip dead keys. Composes `baseEntityColumns` for audit + soft-delete + `user_id` scoping.
 */
export const userProviderKeys = table(
  'user_provider_keys',
  {
    ...baseEntityColumns,
    userId: columnKit
      .integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    providerId: columnKit
      .integer('provider_id')
      .notNull()
      .references(() => providers.id),
    encryptedKey: columnKit.text('encrypted_key').notNull(),
    label: columnKit.text('label'),
    status: columnKit
      .text('status', { enum: ['healthy', 'rate_limited', 'invalid', 'error'] as const })
      .notNull()
      .default('healthy'),
    lastCheckedAt: columnKit.timestamp('last_checked_at'),
  },
  (t) => ({
    ...auditTableExtras('user_provider_keys', t, users.id),
    userIdIdx: index('user_provider_keys_user_id_idx').on(t.userId),
    providerIdIdx: index('user_provider_keys_provider_id_idx').on(t.providerId),
  }),
);
