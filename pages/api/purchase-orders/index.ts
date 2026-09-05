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
        po.id, po.po_number, po.po_date, po.expected_delivery_date,
        po.status, po.subtotal, po.tax_amount, po.total_amount, po.notes,
        po.created_at,
        c.id as vendor_id, c.name as vendor_name, c.email as vendor_email
      FROM purchase_orders po
      LEFT JOIN contacts c ON po.vendor_id = c.id
      ORDER BY po.created_at DESC
    `);
    return res.status(200).json({ orders: result.rows });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to fetch purchase orders', error: error.message });
  }
}

async function handleCreate(req: AuthenticatedRequest, res: NextApiResponse) {
  const client = await pool.connect();
  try {
    const { vendor_id, po_date, expected_delivery_date, notes, items } = req.body;
    if (!vendor_id || !po_date || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'vendor_id, po_date, and at least one item are required' });
    }

    await client.query('BEGIN');

    // Generate unique PO number: PO-YYYYMMDD-XXXX
    const countRes = await client.query('SELECT COUNT(*) FROM purchase_orders');
    const seq = parseInt(countRes.rows[0].count, 10) + 1;
    const po_number = `PO-${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`;

    let subtotal = 0;
    let tax_amount = 0;

    for (const item of items) {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      const taxRate = parseFloat(item.tax_rate) || 0;
      const lineSubtotal = qty * price;
      const lineTax = (lineSubtotal * taxRate) / 100;
      subtotal += lineSubtotal;
      tax_amount += lineTax;
    }

    const total_amount = subtotal + tax_amount;

    const poRes = await client.query(
      `INSERT INTO purchase_orders 
        (po_number, vendor_id, po_date, expected_delivery_date, status, subtotal, tax_amount, total_amount, notes, created_by)
       VALUES ($1, $2, $3, $4, 'Draft', $5, $6, $7, $8, $9)
       RETURNING *`,
      [po_number, vendor_id, po_date, expected_delivery_date || null, subtotal, tax_amount, total_amount, notes || null, req.user?.id || null]
    );

    const po = poRes.rows[0];

    for (const item of items) {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      const taxRate = parseFloat(item.tax_rate) || 0;

      await client.query(
        `INSERT INTO purchase_order_items 
          (purchase_order_id, product_id, description, quantity, unit_price, tax_rate)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [po.id, item.product_id || null, item.description || '', qty, price, taxRate]
      );
    }

    await client.query('COMMIT');
    return res.status(201).json({ message: 'Purchase order created successfully', order: po });
  } catch (error: any) {
    await client.query('ROLLBACK');
    return res.status(500).json({ message: 'Failed to create purchase order', error: error.message });
  } finally {
    client.release();
  }
}

export default requirePermission('canCreateTransactions', handler);
