import { describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { createDb, type Db, type DatabaseService } from '../../database/index.js';
import { ProviderRepository } from './provider.repository.js';
import { PROVIDER_SEED, ProviderCatalogSeeder } from './provider-catalog.seeder.js';

// Mirrors migrations/sqlite for the providers catalog (baseColumns + provider fields).
const CREATE_PROVIDERS = sql`CREATE TABLE providers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  models_endpoint TEXT,
  adapter_type TEXT NOT NULL,
  supports_streaming INTEGER NOT NULL DEFAULT 1,
  supports_tools INTEGER NOT NULL DEFAULT 0,
  supports_vision INTEGER NOT NULL DEFAULT 0,
  supports_embeddings INTEGER NOT NULL DEFAULT 0
)`;

/** Wraps a raw client in a minimal {@link DatabaseService} stub so the repository can read `.db`. */
function asDatabase(db: Db): DatabaseService {
  return { db } as unknown as DatabaseService;
}

describe('ProviderCatalogSeeder', () => {
  it('seeds the catalog idempotently (running twice yields exactly one row per provider)', async () => {
    const db = createDb();
    await db.run(CREATE_PROVIDERS);
    const repository = new ProviderRepository(asDatabase(db));
    const seeder = new ProviderCatalogSeeder(repository);

    await seeder.onApplicationBootstrap();
    await seeder.onApplicationBootstrap(); // second run must be a no-op (onConflictDoNothing)

    const rows = await repository.listAll();
    expect(rows).toHaveLength(PROVIDER_SEED.length);
    expect(new Set(rows.map((row) => row.key)).size).toBe(PROVIDER_SEED.length);
    // HuggingFace has no machine-readable models endpoint.
    expect(rows.find((row) => row.key === 'huggingface')?.modelsEndpoint).toBeNull();
  });

  it('seeds 11 providers, all with a registered adapter type', () => {
    expect(PROVIDER_SEED).toHaveLength(11);
    expect(PROVIDER_SEED.every((row) => typeof row.adapterType === 'string')).toBe(true);
  });
});
