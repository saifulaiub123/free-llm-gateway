import { afterAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Db, DatabaseService } from '../../database/index.js';
import { RoutingStrategyRepository } from './routing-strategy.repository.js';

const STRATEGIES_DDL = sql`CREATE TABLE routing_strategies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  created_by INTEGER, modified_by INTEGER, modified_at INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1, is_deleted INTEGER NOT NULL DEFAULT 0,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL, name TEXT NOT NULL, config TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0
)`;

const ORDER_DDL = sql`CREATE TABLE strategy_model_order (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  strategy_id INTEGER NOT NULL,
  user_model_id INTEGER NOT NULL,
  position INTEGER NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1
)`;

function asDatabase(db: Db): DatabaseService {
  return { db } as unknown as DatabaseService;
}

// WHY a temp FILE (not `:memory:`): libSQL `:memory:` isolates each connection, so a `db.transaction`
// (used by setDefault/replaceOrder) opens a fresh empty db that cannot see tables created on the main
// connection. A file is shared across connections. Cleanup is best-effort (Windows file lock).
const cleanups: Array<() => void> = [];
afterAll(() => {
  for (const cleanup of cleanups) {
    cleanup();
  }
});

async function freshRepo(): Promise<RoutingStrategyRepository> {
  const dir = mkdtempSync(join(tmpdir(), 'routing-'));
  const client = createClient({ url: `file:${join(dir, 'test.db')}` });
  const db = drizzle(client) as unknown as Db;
  await db.run(STRATEGIES_DDL);
  await db.run(ORDER_DDL);
  cleanups.push(() => {
    client.close();
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // best-effort: libSQL may hold the file briefly on Windows.
    }
  });
  return new RoutingStrategyRepository(asDatabase(db));
}

describe('RoutingStrategyRepository', () => {
  it('setDefault keeps exactly one default per user (unsets the previous)', async () => {
    const repo = await freshRepo();
    const a = await repo.createForUser(1, 'balanced', 'A', '{}');
    const b = await repo.createForUser(1, 'smart', 'B', '{}');

    await repo.setDefault(1, a.id);
    await repo.setDefault(1, b.id);

    expect((await repo.findDefault(1))?.id).toBe(b.id);
    expect((await repo.listByUser(1)).filter((s) => s.isDefault)).toHaveLength(1);
  });

  it('replaceOrder replaces the saved positions for that strategy', async () => {
    const repo = await freshRepo();
    const strategy = await repo.createForUser(1, 'manual', 'M', '{}');

    await repo.replaceOrder(1, strategy.id, [
      { userModelId: 10, position: 0 },
      { userModelId: 11, position: 1 },
    ]);
    await repo.replaceOrder(1, strategy.id, [{ userModelId: 11, position: 0 }]);

    const positions = await repo.loadPositions(strategy.id);
    expect(positions.size).toBe(1);
    expect(positions.get(11)).toBe(0);
  });

  it("does not touch another user's strategy (SEC-004)", async () => {
    const repo = await freshRepo();
    const strategy = await repo.createForUser(1, 'balanced', 'A', '{}');
    expect(await repo.findOwned(2, strategy.id)).toBeUndefined();
    expect(await repo.setDefault(2, strategy.id)).toBe(false);
    expect(await repo.replaceOrder(2, strategy.id, [])).toBe(false);
  });
});
