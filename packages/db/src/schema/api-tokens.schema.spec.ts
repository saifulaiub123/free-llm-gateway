import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { apiTokens } from '@gateway/db';

// DDL mirroring migrations/sqlite/0001_* so the in-memory db has the api_tokens table.
const API_TOKENS_DDL = `CREATE TABLE api_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  created_by INTEGER,
  modified_by INTEGER,
  modified_at INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  user_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  prefix TEXT NOT NULL,
  last_used_at INTEGER,
  revoked INTEGER NOT NULL DEFAULT 0
)`;

/** A fresh in-memory db with the `api_tokens` table, for schema round-trip checks. */
async function freshDb(): Promise<ReturnType<typeof drizzle>> {
  const client = createClient({ url: ':memory:' });
  await client.execute(API_TOKENS_DDL);
  return drizzle(client);
}

/**
 * Verifies the `api_tokens` entity round-trips and that its defaults/constraints apply, since the
 * `/v1` gateway auth (TASK-014/015) looks tokens up by their unique SHA-256 hash (TASK-011).
 */
describe('api_tokens schema (TASK-011)', () => {
  it('round-trips an api token with defaults applied', async () => {
    const db = await freshDb();
    const inserted = await db
      .insert(apiTokens)
      .values({ userId: 1, tokenHash: 'hash', name: 'scraperq-ci', prefix: 'sqr-llm-AB12' })
      .returning();
    const token = inserted[0];
    expect(token?.revoked).toBe(false); // column default
    expect(token?.isActive).toBe(true);
    expect(token?.lastUsedAt).toBeNull();

    const found = (
      await db.select().from(apiTokens).where(eq(apiTokens.tokenHash, 'hash')).limit(1)
    )[0];
    expect(found?.prefix).toBe('sqr-llm-AB12');
    expect(found?.name).toBe('scraperq-ci');
  });

  it('enforces the unique token_hash constraint', async () => {
    const db = await freshDb();
    await db.insert(apiTokens).values({ userId: 1, tokenHash: 'dup', name: 'a', prefix: 'p' });
    await expect(
      db.insert(apiTokens).values({ userId: 1, tokenHash: 'dup', name: 'b', prefix: 'p' }),
    ).rejects.toThrow();
  });
});
