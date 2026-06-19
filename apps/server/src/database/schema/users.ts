import { getActiveProvider } from '../providers/registry.js';
import { baseEntityColumns } from './columns.js';
import { auditTableExtras } from './audit.js';

const { table, columnKit } = getActiveProvider();

/**
 * Application user.
 *
 * `role` gates admin-only management endpoints; `passwordHash` stores the Argon2id hash (never the
 * plaintext). Composes `baseEntityColumns`, so it carries the audit + soft-delete columns and a
 * self-referential `createdBy`/`modifiedBy` FK to its own `id` (the first user has them null).
 */
export const users = table(
  'users',
  {
    ...baseEntityColumns,
    email: columnKit.text('email').notNull().unique(),
    passwordHash: columnKit.text('password_hash').notNull(),
    role: columnKit.text('role', { enum: ['admin', 'user'] as const }).notNull().default('user'),
  },
  // Self-referential audit FK: createdBy/modifiedBy -> users.id (ON DELETE SET NULL + indexes).
  (t) => auditTableExtras('users', t, t.id),
);
