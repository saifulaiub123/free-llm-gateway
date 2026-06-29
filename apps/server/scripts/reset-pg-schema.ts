/**
 * Drops and recreates the PG schema for a clean migration regeneration.
 * Run: tsx --env-file-if-exists=../../.env scripts/reset-pg-schema.ts
 */
import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../.env') });

const { Pool } = await import('pg');

async function reset() {
  const url = process.env.DB_URL;
  if (!url || url.startsWith('file:')) {
    console.error('DB_URL is not set to a PostgreSQL URL');
    process.exit(1);
  }
  const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 5_000 });
  try {
    const schema = process.env.DB_SCHEMA ?? 'public';
    const prefix = process.env.DB_TABLE_PREFIX ?? '';

    // Drop the target schema and everything in it
    await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    console.log(`✓ Dropped schema "${schema}"`);

    // Drop the drizzle migrations tracking table and any prefixed tables in public
    await pool.query('DROP TABLE IF EXISTS public.__drizzle_migrations CASCADE');
    const { rows } = await pool.query(
      `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE '${prefix}%'`,
    );
    for (const row of rows) {
      await pool.query(`DROP TABLE IF EXISTS public."${row.tablename}" CASCADE`);
      console.log(`  Dropped public.${row.tablename}`);
    }

    // Recreate the schema
    await pool.query(`CREATE SCHEMA "${schema}"`);
    console.log(`✓ Created schema "${schema}"`);

    console.log('\nReady to regenerate migrations. Run: pnpm db:generate');
  } finally {
    await pool.end();
  }
}

reset().catch((err) => {
  console.error('Reset failed:', err);
  process.exit(1);
});
