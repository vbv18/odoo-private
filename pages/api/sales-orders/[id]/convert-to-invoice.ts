import { NextApiResponse } from 'next';
import { pool } from '@/lib/db';
import { AuthenticatedRequest, requirePermission } from '@/lib/auth-middleware';
import { resolveCreatedBy } from '@/lib/db-users';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  const { id } = req.query;
  if (!id || typeof id !== 'string') return res.status(400).json({ message: 'Invalid sales order ID' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const soRes = await client.query('SELECT * FROM sales_orders WHERE id = $1', [id]);
    if (soRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Sales order not found' });
    }
    const so = soRes.rows[0];

    const existingInv = await client.query('SELECT id, invoice_number FROM customer_invoices WHERE sales_order_id = $1', [id]);
    if (existingInv.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        message: `An invoice (${existingInv.rows[0].invoice_number}) has already been generated for this sales order.`,
        invoice_id: existingInv.rows[0].id,
      });
    }

    const itemsRes = await client.query('SELECT * FROM sales_order_items WHERE sales_order_id = $1', [id]);
    const soItems = itemsRes.rows;

    const countRes = await client.query('SELECT COUNT(*) FROM customer_invoices');
    const seq = parseInt(countRes.rows[0].count, 10) + 1;
    const invoice_number = `INV-${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`;

    const invoiceDate = new Date().toISOString().split('T')[0];
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const createdBy = await resolveCreatedBy(req.user?.id, client);

    const invRes = await client.query(
      `INSERT INTO customer_invoices 
        (invoice_number, customer_id, sales_order_id, invoice_date, due_date, status, subtotal, tax_amount, total_amount, paid_amount, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, 'Draft', $6, $7, $8, 0, $9, $10)
       RETURNING *`,
      [
        invoice_number,
        so.customer_id,
        so.id,
        invoiceDate,
        dueDate,
        so.subtotal,
        so.tax_amount,
        so.total_amount,
        `Generated from Sales Order ${so.so_number}`,
        createdBy,
      ]
    );
    const invoice = invRes.rows[0];

    for (const item of soItems) {
      await client.query(
        `INSERT INTO customer_invoice_items 
          (customer_invoice_id, product_id, description, quantity, unit_price, tax_rate)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [invoice.id, item.product_id, item.description, item.quantity, item.unit_price, item.tax_rate]
      );
    }

    await client.query(
      `UPDATE sales_orders SET status = 'Delivered', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );

    await client.query('COMMIT');
    return res.status(201).json({
      message: 'Sales order converted to Customer Invoice successfully',
      invoice,
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    return res.status(500).json({ message: 'Failed to convert to invoice', error: error.message });
  } finally {
    client.release();
  }
}

export default requirePermission('canCreateTransactions', handler);
