import { NextApiResponse } from 'next';
import { pool } from '@/lib/db';
import { AuthenticatedRequest, requirePermission } from '@/lib/auth-middleware';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  const { id } = req.query;
  if (!id || typeof id !== 'string') return res.status(400).json({ message: 'Invalid purchase order ID' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch PO with items
    const poRes = await client.query('SELECT * FROM purchase_orders WHERE id = $1', [id]);
    if (poRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Purchase order not found' });
    }
    const po = poRes.rows[0];

    // Check if bill already exists for this PO
    const existingBill = await client.query('SELECT id, bill_number FROM vendor_bills WHERE purchase_order_id = $1', [id]);
    if (existingBill.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        message: `A bill (${existingBill.rows[0].bill_number}) has already been generated for this purchase order.`,
        bill_id: existingBill.rows[0].id,
      });
    }

    const itemsRes = await client.query('SELECT * FROM purchase_order_items WHERE purchase_order_id = $1', [id]);
    const poItems = itemsRes.rows;

    // 2. Generate unique Bill Number: BILL-YYYY-XXXX
    const countRes = await client.query('SELECT COUNT(*) FROM vendor_bills');
    const seq = parseInt(countRes.rows[0].count, 10) + 1;
    const bill_number = `BILL-${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`;

    const billDate = new Date().toISOString().split('T')[0];
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // 3. Create Vendor Bill
    const billRes = await client.query(
      `INSERT INTO vendor_bills 
        (bill_number, vendor_id, purchase_order_id, bill_date, due_date, status, subtotal, tax_amount, total_amount, paid_amount, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, 'Draft', $6, $7, $8, 0, $9, $10)
       RETURNING *`,
      [
        bill_number,
        po.vendor_id,
        po.id,
        billDate,
        dueDate,
        po.subtotal,
        po.tax_amount,
        po.total_amount,
        `Generated from Purchase Order ${po.po_number}`,
        req.user?.id || null,
      ]
    );
    const bill = billRes.rows[0];

    // 4. Create Vendor Bill Items
    for (const item of poItems) {
      await client.query(
        `INSERT INTO vendor_bill_items 
          (vendor_bill_id, product_id, description, quantity, unit_price, tax_rate)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [bill.id, item.product_id, item.description, item.quantity, item.unit_price, item.tax_rate]
      );
    }

    // 5. Update PO status to Received
    await client.query(
      `UPDATE purchase_orders SET status = 'Received', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );

    await client.query('COMMIT');
    return res.status(201).json({
      message: 'Purchase order converted to Vendor Bill successfully',
      bill,
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    return res.status(500).json({ message: 'Failed to convert to bill', error: error.message });
  } finally {
    client.release();
  }
}

export default requirePermission('canCreateTransactions', handler);
