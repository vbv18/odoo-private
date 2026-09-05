// run-migration.js — run this once to fix the customer_invoices status constraint
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres123@localhost:5432/ledgercraft',
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('Dropping old constraint...');
    await client.query(`ALTER TABLE customer_invoices DROP CONSTRAINT IF EXISTS customer_invoices_status_check`);
    console.log('Adding new constraint with Sent and Overdue...');
    await client.query(`ALTER TABLE customer_invoices ADD CONSTRAINT customer_invoices_status_check CHECK (status IN ('Draft', 'Sent', 'Posted', 'Paid', 'Overdue', 'Cancelled'))`);
    console.log('✅ Migration complete! customer_invoices now accepts: Draft, Sent, Posted, Paid, Overdue, Cancelled');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
