const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const tables = ['sales_orders', 'journal_entries'];
  for (const t of tables) {
    const r = await p.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name=$1 ORDER BY ordinal_position", [t]
    );
    console.log(`\n=== ${t} ===`);
    console.log(r.rows.map(x => x.column_name).join(', '));
  }
  p.end();
}
check().catch(e => { console.error(e); p.end(); });
