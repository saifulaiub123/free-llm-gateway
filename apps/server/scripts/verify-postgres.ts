import { Pool } from 'pg';

/**
 * Cross-driver verification (TASK-064 / TEST-011): proves the committed PostgreSQL migrations apply
 * cleanly and that `DB_SCHEMA` is honored — the `users` table must exist in the configured schema and
 * round-trip an insert/select/delete. Run AFTER `pnpm --filter server db:migrate` with
 * `DB_PROVIDER=postgres`. Exits non-zero on any failure so CI fails loudly.
 */
const schema = process.env.DB_SCHEMA ?? 'public';
const connectionString = process.env.DB_URL ?? '';

async function main(): Promise<void> {
  const pool = connectionString ? new Pool({ connectionString }) : new Pool();
  pool.on('connect', (client) => {
    void client.query(`SET search_path TO "${schema}"`);
  });
  try {
    const registered = await pool.query<{ table: string | null }>(
      'SELECT to_regclass($1) AS table',
      [`"${schema}".users`],
    );
    if (!registered.rows[0]?.table) {
      throw new Error(`users table not found in schema "${schema}" — migrations did not honor DB_SCHEMA`);
    }

    const email = `verify+${Date.now()}@example.com`;
    const inserted = await pool.query<{ id: number }>(
      'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id',
      [email, 'verify-hash', 'user'],
    );
    const id = inserted.rows[0]?.id;
    const selected = await pool.query<{ email: string }>('SELECT email FROM users WHERE id = $1', [id]);
    if (selected.rows[0]?.email !== email) {
      throw new Error('round-trip mismatch: inserted user not read back');
    }
    await pool.query('DELETE FROM users WHERE id = $1', [id]);

    console.log(`OK: PostgreSQL cross-driver verification passed (schema="${schema}").`);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
