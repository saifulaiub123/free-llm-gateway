import { getActiveProvider } from '../providers/registry.js';
import { baseColumns } from './columns.js';

const { table, columnKit } = getActiveProvider();

/**
 * Global, seeded catalog of supported providers (TASK-017). NOT user-scoped and holds NO models.
 *
 * WHY only `baseColumns`: this is an install-time reference table populated by the idempotent seeder,
 * not a user-facing domain entity, so it needs `id`/`createdAt` but no audit/soft-delete columns.
 * `adapterType` matches the `AdapterRegistry` key; `modelsEndpoint` is null for providers (e.g.
 * HuggingFace) that expose no machine-readable model list.
 */
export const providers = table('providers', {
  ...baseColumns,
  key: columnKit.text('key').notNull().unique(), // e.g. "groq", "openrouter", "gemini"
  displayName: columnKit.text('display_name').notNull(),
  baseUrl: columnKit.text('base_url').notNull(),
  modelsEndpoint: columnKit.text('models_endpoint'), // nullable: some providers have no list endpoint
  adapterType: columnKit.text('adapter_type').notNull(), // matches AdapterRegistry key
  supportsStreaming: columnKit.boolean('supports_streaming').notNull().default(true),
  supportsTools: columnKit.boolean('supports_tools').notNull().default(false),
  supportsVision: columnKit.boolean('supports_vision').notNull().default(false),
  supportsEmbeddings: columnKit.boolean('supports_embeddings').notNull().default(false),
});
