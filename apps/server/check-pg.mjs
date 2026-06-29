import { Pool } from 'pg';
const p = new Pool({
  connectionString: 'postgres://postgres:Pass@123@localhost:5432/ScrapperQdb',
  connectionTimeoutMillis: 5000
});
try {
  const r = await p.query("SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'free_llm'");
  console.log('Schema free_llm exists:', r.rows.length > 0);
  if (r.rows.length > 0) {
    const tables = await p.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'free_llm'");
    console.log('Tables in free_llm:', tables.rows.map(t => t.table_name).join(', '));
  } else {
    const tables = await p.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log('Tables in public:', tables.rows.map(t => t.table_name).join(', '));
  }
} catch(e) {
  console.log('FAIL:', e.message);
}
await p.end();
