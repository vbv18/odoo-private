const { Pool } = require('pg');
const p = new Pool({ host: 'localhost', port: 5432, database: 'ledgercraft', user: 'postgres', password: 'postgres123', connectionTimeoutMillis: 3000 });

async function main() {
  const ts = Date.now();
  const errors = [];
  
  try { await p.query('BEGIN'); } catch(e) {}

  try {
    // 1. Contact
    const c = await p.query("INSERT INTO contacts (name, contact_type) VALUES ($1, $2) RETURNING id", ['Test Customer '+ts, 'Customer']);
    const cid = c.rows[0].id;
    console.log('✅ Contact created:', cid);

    // 2. Product
    const pr = await p.query("INSERT INTO products (product_name, unit_of_measure, sales_price, cost_price, product_type, stock_quantity) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id",
      ['TestProd '+ts, 'Unit', 100, 80, 'Goods', 10]);
    const pid = pr.rows[0].id;
    console.log('✅ Product created:', pid);

    // 3. Sales Order + items
    const so = await p.query("INSERT INTO sales_orders (so_number, customer_id, so_date, status, subtotal, tax_amount, total_amount) VALUES ($1,$2,$3,'Draft',$4,$5,$6) RETURNING id",
      ['SO-TEST-'+ts, cid, new Date().toISOString().split('T')[0], 100, 18, 118]);
    const soid = so.rows[0].id;
    await p.query("INSERT INTO sales_order_items (sales_order_id, product_id, description, quantity, unit_price, tax_rate) VALUES ($1,$2,$3,$4,$5,$6)",
      [soid, pid, 'Test item', 1, 100, 18]);
    console.log('✅ Sales order + items created:', soid);

    // 4. Purchase Order + items
    const po = await p.query("INSERT INTO purchase_orders (po_number, vendor_id, po_date, status, subtotal, tax_amount, total_amount) VALUES ($1,$2,$3,'Draft',$4,$5,$6) RETURNING id",
      ['PO-TEST-'+ts, cid, new Date().toISOString().split('T')[0], 100, 18, 118]);
    const poid = po.rows[0].id;
    await p.query("INSERT INTO purchase_order_items (purchase_order_id, product_id, description, quantity, unit_price, tax_rate) VALUES ($1,$2,$3,$4,$5,$6)",
      [poid, pid, 'Test item', 1, 100, 18]);
    console.log('✅ Purchase order + items created:', poid);

    // 5. Customer Invoice + items
    const inv = await p.query("INSERT INTO customer_invoices (invoice_number, customer_id, invoice_date, due_date, status, subtotal, tax_amount, total_amount, paid_amount) VALUES ($1,$2,$3,$4,'Draft',$5,$6,$7,$8) RETURNING id",
      ['INV-TEST-'+ts, cid, new Date().toISOString().split('T')[0], new Date().toISOString().split('T')[0], 100, 18, 118, 0]);
    const invid = inv.rows[0].id;
    await p.query("INSERT INTO customer_invoice_items (customer_invoice_id, product_id, description, quantity, unit_price, tax_rate) VALUES ($1,$2,$3,$4,$5,$6)",
      [invid, pid, 'Test item', 1, 100, 18]);
    console.log('✅ Customer invoice + items created:', invid);

    // 6. Vendor Bill + items
    const bill = await p.query("INSERT INTO vendor_bills (bill_number, vendor_id, bill_date, due_date, status, subtotal, tax_amount, total_amount, paid_amount) VALUES ($1,$2,$3,$4,'Draft',$5,$6,$7,$8) RETURNING id",
      ['BILL-TEST-'+ts, cid, new Date().toISOString().split('T')[0], new Date().toISOString().split('T')[0], 100, 18, 118, 0]);
    const billid = bill.rows[0].id;
    await p.query("INSERT INTO vendor_bill_items (vendor_bill_id, product_id, description, quantity, unit_price, tax_rate) VALUES ($1,$2,$3,$4,$5,$6)",
      [billid, pid, 'Test item', 1, 100, 18]);
    console.log('✅ Vendor bill + items created:', billid);

    // 7. Payment
    const pay = await p.query("INSERT INTO payments (payment_number, payment_type, payment_method, partner_id, payment_date, amount, reference_type) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id",
      ['PAY-TEST-'+ts, 'Receipt', 'Bank Transfer', cid, new Date().toISOString().split('T')[0], 118, 'Manual']);
    console.log('✅ Payment created:', pay.rows[0].id);

    await p.query('ROLLBACK');
    console.log('\n✅ All create operations PASSED. Test data rolled back.');
  } catch(e) {
    await p.query('ROLLBACK').catch(()=>{});
    console.error('\n❌ FAILED:', e.message);
  }
  await p.end();
}
main();
