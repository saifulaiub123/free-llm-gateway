import { getActiveProvider } from '../providers/registry.js';
import { baseEntityColumns } from './columns.js';
import { auditTableExtras } from './audit.js';
import { users } from './users.js';
import { models } from './models.js';
import { providers } from './providers.js';
import { userProviderKeys } from './user-provider-keys.js';

const { table, columnKit, index } = getActiveProvider();

/**
 * Per-user model state (TASK-029): enable/disable a catalog model, plus user-defined custom models.
 *
 * WHY `modelId` is nullable: a fully-custom model has no catalog row — its details (model id,
 * display name, costs, capabilities) live in `overrides` (JSON text) alongside `customProviderId`.
 * For catalog models, `modelId` points at `models` and `overrides` may tweak cost/capability fields.
 * Composes `baseEntityColumns` for audit + soft-delete + `user_id` scoping (SEC-004).
 *
 * `providerKeyId` (KSM-001): associates each user model row with the stored provider key that
 * discovered it. Nullable so legacy rows and fully-custom models remain representable. When set,
 * it routes using that specific key rather than picking the first healthy key per provider.
 */
export const userModels = table(
  'user_models',
  {
    ...baseEntityColumns,
    userId: columnKit
      .integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    modelId: columnKit.integer('model_id').references(() => models.id, { onDelete: 'cascade' }), // null = fully custom
    customProviderId: columnKit.integer('custom_provider_id').references(() => providers.id),
    providerKeyId: columnKit
      .integer('provider_key_id')
      .references(() => userProviderKeys.id, { onDelete: 'set null' }),
    enabled: columnKit.boolean('enabled').notNull().default(true),
    isCustom: columnKit.boolean('is_custom').notNull().default(false),
    overrides: columnKit.text('overrides'), // nullable JSON-encoded cost/capability (and custom) fields
  },
  (t) => ({
    ...auditTableExtras('user_models', t, users.id),
    userIdIdx: index('user_models_user_id_idx').on(t.userId),
    modelIdIdx: index('user_models_model_id_idx').on(t.modelId),
    providerKeyIdIdx: index('user_models_provider_key_id_idx').on(t.providerKeyId),
    userProviderModelIdx: index('user_models_user_provider_model_idx').on(t.userId, t.providerKeyId, t.modelId),
  }),
);
