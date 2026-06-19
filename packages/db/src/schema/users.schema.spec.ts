import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { refreshTokens, users } from '@gateway/db';

// DDL mirroring migrations/sqlite/0000_* so the in-memory db has the Phase 1 identity tables.
const USERS_DDL = `CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  created_by INTEGER,
  modified_by INTEGER,
  modified_at INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user'
)`;

const REFRESH_TOKENS_DDL = `CREATE TABLE refresh_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  user_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  family_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER,
  replaced_by_token_id INTEGER,
  created_by_ip TEXT,
  user_agent TEXT
)`;

/** A fresh in-memory db with the Phase 1 identity tables, for schema round-trip checks. */
function freshDb(): ReturnType<typeof drizzle> {
  const sqlite = new Database(':memory:');
  sqlite.exec(USERS_DDL);
  sqlite.exec(REFRESH_TOKENS_DDL);
  return drizzle(sqlite);
}

/**
 * Verifies the `users` + `refresh_tokens` entities round-trip and that their defaults/constraints
 * apply, since every auth flow (TASK-012+) builds on these two tables (TASK-010).
 */
describe('users + refresh_tokens schema (TASK-010)', () => {
  it('round-trips a user and a refresh token with defaults applied', () => {
    const db = freshDb();
    const inserted = db
      .insert(users)
      .values({ email: 'alice@example.com', passwordHash: 'hash' })
      .returning()
      .all();
    const user = inserted[0];
    expect(user?.role).toBe('user'); // column default
    expect(user?.isActive).toBe(true);
    expect(user?.isDeleted).toBe(false);

    db.insert(refreshTokens)
      .values({
        userId: user!.id,
        tokenHash: 'token-hash',
        familyId: 'family-1',
        expiresAt: new Date(Date.now() + 3_600_000),
      })
      .run();

    const found = db.select().from(users).where(eq(users.email, 'alice@example.com')).get();
    expect(found?.passwordHash).toBe('hash');

    const tokens = db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.userId, user!.id))
      .all();
    expect(tokens).toHaveLength(1);
    expect(tokens[0]?.familyId).toBe('family-1');
    expect(tokens[0]?.expiresAt).toBeInstanceOf(Date);
  });

  it('enforces the unique email constraint', () => {
    const db = freshDb();
    db.insert(users).values({ email: 'dup@example.com', passwordHash: 'h1' }).run();
    expect(() =>
      db.insert(users).values({ email: 'dup@example.com', passwordHash: 'h2' }).run(),
    ).toThrow();
  });
});
