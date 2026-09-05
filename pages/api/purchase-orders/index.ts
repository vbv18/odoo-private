import { NextApiResponse } from 'next';
import { AuthenticatedRequest, authenticateToken } from '@/lib/auth-middleware';
import { isDbAvailable } from '@/lib/db-safe';
import { getPurchaseOrders, savePurchaseOrders } from '@/lib/mock-data';
import { pool } from '@/lib/db';
import { randomUUID } from 'crypto';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method === 'GET') return handleGet(req, res);
  if (req.method === 'POST') return handleCreate(req, res);
  return res.status(405).json({ message: 'Method not allowed' });
}

async function handleGet(req: AuthenticatedRequest, res: NextApiResponse) {
  const dbOk = await isDbAvailable();
  const { status, search } = req.query;
  if (!dbOk) {
    let orders = getPurchaseOrders();
    if (status) orders = orders.filter((o: any) => o.status === status);
    if (search) orders = orders.filter((o: any) =>
      o.order_number.toLowerCase().includes((search as string).toLowerCase()) ||
      (o.vendor_name || '').toLowerCase().includes((search as string).toLowerCase())
    );
    return res.status(200).json({ orders, total: orders.length, source: 'mock' });
  }
  try {
    let query = `
      SELECT po.*, c.name as vendor_name, c.email as vendor_email
      FROM purchase_orders po LEFT JOIN contacts c ON po.vendor_id = c.id WHERE 1=1`;
    const params: any[] = [];
    let n = 1;
    if (status) { query += ` AND po.status = $${n}`; params.push(status); n++; }
    if (search) { query += ` AND (po.order_number ILIKE $${n} OR c.name ILIKE $${n})`; params.push(`%${search}%`); n++; }
    query += ` ORDER BY po.created_at DESC`;
    const result = await pool.query(query, params);
    return res.status(200).json({ orders: result.rows, total: result.rows.length });
  } catch {
    return res.status(200).json({ orders: getPurchaseOrders(), source: 'mock' });
  }
}

async function handleCreate(req: AuthenticatedRequest, res: NextApiResponse) {
  const { vendor_id, order_date, expected_date, notes, items } = req.body;
  if (!vendor_id || !order_date || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'vendor_id, order_date, and items are required' });
  }
  let subtotal = 0, tax_amount = 0;
  for (const item of items) {
    const lineSub = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
    subtotal += lineSub;
    tax_amount += (lineSub * (parseFloat(item.tax_rate) || 0)) / 100;
  }
  const total_amount = subtotal + tax_amount;
  const dbOk = await isDbAvailable();
  if (!dbOk) {
    const orders = getPurchaseOrders();
    const seq = orders.length + 1;
    const newOrder = { id: randomUUID(), order_number: `PO-${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`, vendor_id, vendor_name: 'Vendor', order_date, expected_date: expected_date || null, status: 'Draft', subtotal, tax_amount, total_amount, notes: notes || null, created_at: new Date().toISOString() };
    orders.push(newOrder);
    savePurchaseOrders(orders);
    return res.status(201).json({ message: 'Purchase order created', order: newOrder, source: 'mock' });
  }
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const seq = (await client.query('SELECT COUNT(*) FROM purchase_orders')).rows[0].count;
      const order_number = `PO-${new Date().getFullYear()}-${String(parseInt(seq) + 1).padStart(4, '0')}`;
      const poRes = await client.query(
        `INSERT INTO purchase_orders (order_number, vendor_id, order_date, expected_date, status, subtotal, tax_amount, total_amount, notes, created_by)
         VALUES ($1,$2,$3,$4,'Draft',$5,$6,$7,$8,$9) RETURNING *`,
        [order_number, vendor_id, order_date, expected_date || null, subtotal, tax_amount, total_amount, notes || null, req.user?.id || null]
      );
      for (const item of items) {
        await client.query(
          `INSERT INTO purchase_order_items (purchase_order_id, product_id, description, quantity, unit_price, tax_rate) VALUES ($1,$2,$3,$4,$5,$6)`,
          [poRes.rows[0].id, item.product_id || null, item.description || '', item.quantity, item.unit_price, item.tax_rate || 0]
        );
      }
      await client.query('COMMIT');
      return res.status(201).json({ message: 'Purchase order created successfully', order: poRes.rows[0] });
    } catch (err) { await client.query('ROLLBACK'); throw err; }
    finally { client.release(); }
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to create purchase order', error: error.message });
  }
}

export default authenticateToken(handler);
