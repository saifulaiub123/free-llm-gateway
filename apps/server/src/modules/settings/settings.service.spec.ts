import { describe, expect, it } from 'vitest';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { ZodError } from 'zod';
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

describe('SettingsService (TASK-072)', () => {
  it('returns the registry default when no row exists, then the DB override after set', async () => {
    const service = await freshService();

    // Registry default for a global boolean setting.
    expect(await service.get('auth.registration_enabled')).toBe(true);

    await service.set('auth.registration_enabled', false);
    expect(await service.get('auth.registration_enabled')).toBe(false);
  });

  it('rejects a value that fails the registry schema', async () => {
    const service = await freshService();
    await expect(
      service.set('auth.registration_enabled', 'nope' as unknown as boolean),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it('lists global settings with their metadata for the admin UI', async () => {
    const service = await freshService();
    await service.set('auth.registration_enabled', false);

    const list = await service.listGlobal();
    const entry = list.find((item) => item.key === 'auth.registration_enabled');
    expect(entry).toMatchObject({ value: false, default: true, adminOnly: true });
    expect(entry?.description).toContain('self-register');
  });
});
