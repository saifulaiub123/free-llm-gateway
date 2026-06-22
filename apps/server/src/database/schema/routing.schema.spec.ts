import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { routingStrategies, strategyModelOrder } from '../index.js';

const STRATEGIES_DDL = `CREATE TABLE routing_strategies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  created_by INTEGER, modified_by INTEGER, modified_at INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1, is_deleted INTEGER NOT NULL DEFAULT 0,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  config TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0
)`;

const ORDER_DDL = `CREATE TABLE strategy_model_order (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  strategy_id INTEGER NOT NULL,
  user_model_id INTEGER NOT NULL,
  position INTEGER NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1
)`;

async function freshDb(): Promise<ReturnType<typeof drizzle>> {
  const client = createClient({ url: ':memory:' });
  await client.execute(STRATEGIES_DDL);
  await client.execute(ORDER_DDL);
  return drizzle(client);
}

/**
 * Verifies routing_strategies + strategy_model_order round-trip (TASK-039): each strategy keeps its
 * own ordered model set (REQ-012), and `config` persists as JSON text + `is_default` defaults false.
 */
describe('routing schema (TASK-039)', () => {
  it('round-trips a strategy with JSON config and per-strategy ordering rows', async () => {
    const db = await freshDb();
    const strategy = (
      await db
        .insert(routingStrategies)
        .values({ userId: 1, type: 'balanced', name: 'My Balanced', config: JSON.stringify({ weights: {} }) })
        .returning()
    )[0]!;
    expect(strategy.isDefault).toBe(false);
    expect(JSON.parse(strategy.config)).toMatchObject({ weights: {} });

    await db.insert(strategyModelOrder).values([
      { strategyId: strategy.id, userModelId: 10, position: 0 },
      { strategyId: strategy.id, userModelId: 11, position: 1 },
    ]);
    const order = await db
      .select()
      .from(strategyModelOrder)
      .where(eq(strategyModelOrder.strategyId, strategy.id));
    expect(order).toHaveLength(2);
    expect(order.every((row) => row.enabled)).toBe(true);
  });
});
