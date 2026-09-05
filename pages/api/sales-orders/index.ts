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
        so.id, so.so_number, so.so_date, so.expected_delivery_date,
        so.status, so.subtotal, so.tax_amount, so.total_amount, so.notes,
        so.created_at,
        c.id as customer_id, c.name as customer_name, c.email as customer_email
      FROM sales_orders so
      LEFT JOIN contacts c ON so.customer_id = c.id
      ORDER BY so.created_at DESC
    `);
    return res.status(200).json({ orders: result.rows });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to fetch sales orders', error: error.message });
  }
}

async function handleCreate(req: AuthenticatedRequest, res: NextApiResponse) {
  const client = await pool.connect();
  try {
    const { customer_id, so_date, expected_delivery_date, notes, items } = req.body;
    if (!customer_id || !so_date || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'customer_id, so_date, and at least one item are required' });
    }

    await client.query('BEGIN');

    const countRes = await client.query('SELECT COUNT(*) FROM sales_orders');
    const seq = parseInt(countRes.rows[0].count, 10) + 1;
    const so_number = `SO-${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`;

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

    const soRes = await client.query(
      `INSERT INTO sales_orders 
        (so_number, customer_id, so_date, expected_delivery_date, status, subtotal, tax_amount, total_amount, notes, created_by)
       VALUES ($1, $2, $3, $4, 'Draft', $5, $6, $7, $8, $9)
       RETURNING *`,
      [so_number, customer_id, so_date, expected_delivery_date || null, subtotal, tax_amount, total_amount, notes || null, req.user?.id || null]
    );

    const so = soRes.rows[0];

    for (const item of items) {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      const taxRate = parseFloat(item.tax_rate) || 0;

      await client.query(
        `INSERT INTO sales_order_items 
          (sales_order_id, product_id, description, quantity, unit_price, tax_rate)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [so.id, item.product_id || null, item.description || '', qty, price, taxRate]
      );
    }

    await client.query('COMMIT');
    return res.status(201).json({ message: 'Sales order created successfully', order: so });
  } catch (error: any) {
    await client.query('ROLLBACK');
    return res.status(500).json({ message: 'Failed to create sales order', error: error.message });
  } finally {
    client.release();
  }
}

export default requirePermission('canCreateTransactions', handler);
