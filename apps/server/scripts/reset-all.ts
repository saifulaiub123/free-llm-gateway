import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgres://postgres:Pass@123@localhost:5432/ScrapperQdb',
  connectionTimeoutMillis: 10_000,
});

async function main() {
  // 1. Drop the target schema
  await pool.query('DROP SCHEMA IF EXISTS free_llm CASCADE');
  console.log('✓ Dropped free_llm schema');

  // 2. Drop ALL public tables (old migrations without prefix)
  const { rows } = await pool.query(
    `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT LIKE 'pg_%' AND tablename NOT LIKE 'sql_%'`,
  );
  for (const r of rows) {
    await pool.query(`DROP TABLE IF EXISTS public."${r.tablename}" CASCADE`);
    console.log(`  Dropped public.${r.tablename}`);
  }

  // 3. Drop sequences
  const { rows: seqs } = await pool.query(
    `SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema='public'`,
  );
  for (const s of seqs) {
    await pool.query(`DROP SEQUENCE IF EXISTS public."${s.sequence_name}" CASCADE`);
    console.log(`  Dropped sequence public.${s.sequence_name}`);
  }

  // 4. Recreate the schema
  await pool.query('CREATE SCHEMA free_llm');
  console.log('✓ Created free_llm schema');
  console.log('Done — ready for pnpm db:generate');
  await pool.end();
}

main().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
