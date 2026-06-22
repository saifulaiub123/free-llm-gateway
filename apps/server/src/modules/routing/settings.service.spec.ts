import { describe, expect, it } from 'vitest';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import type { Db, DatabaseService } from '../../database/index.js';
import { SettingsRepository } from './settings.repository.js';
import { SettingsService } from './settings.service.js';

const SETTINGS_DDL = `CREATE TABLE settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  scope TEXT NOT NULL,
  user_id INTEGER,
  key TEXT NOT NULL,
  value TEXT NOT NULL
)`;

function asDatabase(db: Db): DatabaseService {
  return { db } as unknown as DatabaseService;
}

async function freshService(): Promise<SettingsService> {
  const client = createClient({ url: ':memory:' });
  await client.execute(SETTINGS_DDL);
  const db = drizzle(client) as unknown as Db;
  return new SettingsService(new SettingsRepository(asDatabase(db)));
}

describe('SettingsService (TASK-047)', () => {
  it('resolves user override → global → coded default', async () => {
    const service = await freshService();

    // Coded default when nothing is stored.
    expect(await service.get('routing.cooldown_base_ms')).toBe(1_000);

    // Global override.
    await service.setGlobal('routing.max_fallback_attempts', 10);
    expect(await service.get('routing.max_fallback_attempts')).toBe(10);

    // Per-user override beats global, but only for that user.
    await service.setUser(1, 'routing.max_fallback_attempts', 3);
    expect(await service.get('routing.max_fallback_attempts', 1)).toBe(3);
    expect(await service.get('routing.max_fallback_attempts', 2)).toBe(10);
  });

  it('updates an existing setting in place (upsert)', async () => {
    const service = await freshService();
    await service.setGlobal('routing.metric_window_ms', 1);
    await service.setGlobal('routing.metric_window_ms', 2);
    expect(await service.get('routing.metric_window_ms')).toBe(2);
  });
});
