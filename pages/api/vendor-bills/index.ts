import { NextApiResponse } from 'next';
import { pool } from '@/lib/db';
import { AuthenticatedRequest, requirePermission } from '@/lib/auth-middleware';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method === 'GET') return handleGet(req, res);
  if (req.method === 'POST') return handleCreate(req, res);
  return res.status(405).json({ message: 'Method not allowed' });
}

async function handleGet(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const result = await pool.query(`
      SELECT 
        vb.id, vb.bill_number, vb.bill_date, vb.due_date,
        vb.status, vb.subtotal, vb.tax_amount, vb.total_amount,
        vb.paid_amount, (vb.total_amount - vb.paid_amount) as balance_due,
        vb.notes, vb.created_at, vb.purchase_order_id,
        c.id as vendor_id, c.name as vendor_name, c.email as vendor_email
      FROM vendor_bills vb
      LEFT JOIN contacts c ON vb.vendor_id = c.id
      ORDER BY vb.created_at DESC
    `);
    return res.status(200).json({ bills: result.rows });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to fetch vendor bills', error: error.message });
  }
}

async function handleCreate(req: AuthenticatedRequest, res: NextApiResponse) {
  const client = await pool.connect();
  try {
    const { vendor_id, bill_date, due_date, notes, items } = req.body;
    if (!vendor_id || !bill_date || !due_date || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'vendor_id, bill_date, due_date, and items are required' });
    }

    await client.query('BEGIN');

    const countRes = await client.query('SELECT COUNT(*) FROM vendor_bills');
    const seq = parseInt(countRes.rows[0].count, 10) + 1;
    const bill_number = `BILL-${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`;

    let subtotal = 0;
    let tax_amount = 0;

    for (const item of items) {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      const taxRate = parseFloat(item.tax_rate) || 0;
      const lineSub = qty * price;
      subtotal += lineSub;
      tax_amount += (lineSub * taxRate) / 100;
    }

    const total_amount = subtotal + tax_amount;

    const billRes = await client.query(
      `INSERT INTO vendor_bills 
        (bill_number, vendor_id, bill_date, due_date, status, subtotal, tax_amount, total_amount, paid_amount, notes, created_by)
       VALUES ($1, $2, $3, $4, 'Draft', $5, $6, $7, 0, $8, $9)
       RETURNING *`,
      [bill_number, vendor_id, bill_date, due_date, subtotal, tax_amount, total_amount, notes || null, req.user?.id || null]
    );

    const bill = billRes.rows[0];

    for (const item of items) {
      await client.query(
        `INSERT INTO vendor_bill_items 
          (vendor_bill_id, product_id, description, quantity, unit_price, tax_rate)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [bill.id, item.product_id || null, item.description || '', item.quantity, item.unit_price, item.tax_rate || 0]
      );
    }

    await client.query('COMMIT');
    return res.status(201).json({ message: 'Vendor bill created successfully', bill });
  } catch (error: any) {
    await client.query('ROLLBACK');
    return res.status(500).json({ message: 'Failed to create vendor bill', error: error.message });
  } finally {
    client.release();
  }
}

export default requirePermission('canCreateTransactions', handler);
