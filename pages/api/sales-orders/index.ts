import { NextApiResponse } from 'next';
import { AuthenticatedRequest, authenticateToken } from '@/lib/auth-middleware';
import { isDbAvailable } from '@/lib/db-safe';
import { getSalesOrders, saveSalesOrders } from '@/lib/mock-data';
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
    let orders = getSalesOrders();
    if (status) orders = orders.filter((o: any) => o.status === status);
    if (search) orders = orders.filter((o: any) =>
      o.order_number.toLowerCase().includes((search as string).toLowerCase()) ||
      (o.customer_name || '').toLowerCase().includes((search as string).toLowerCase())
    );
    return res.status(200).json({ orders, total: orders.length, source: 'mock' });
  }
  try {
    let query = `
      SELECT so.*, c.name as customer_name, c.email as customer_email
      FROM sales_orders so LEFT JOIN contacts c ON so.customer_id = c.id WHERE 1=1`;
    const params: any[] = [];
    let n = 1;
    if (status) { query += ` AND so.status = $${n}`; params.push(status); n++; }
    if (search) { query += ` AND (so.order_number ILIKE $${n} OR c.name ILIKE $${n})`; params.push(`%${search}%`); n++; }
    query += ` ORDER BY so.created_at DESC`;
    const result = await pool.query(query, params);
    return res.status(200).json({ orders: result.rows, total: result.rows.length });
  } catch {
    return res.status(200).json({ orders: getSalesOrders(), source: 'mock' });
  }
}

async function handleCreate(req: AuthenticatedRequest, res: NextApiResponse) {
  const { customer_id, order_date, delivery_date, notes, items } = req.body;
  if (!customer_id || !order_date || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'customer_id, order_date, and items are required' });
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
    const orders = getSalesOrders();
    const seq = orders.length + 1;
    const newOrder = { id: randomUUID(), order_number: `SO-${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`, customer_id, customer_name: 'Customer', order_date, delivery_date: delivery_date || null, status: 'Draft', subtotal, tax_amount, total_amount, notes: notes || null, created_at: new Date().toISOString() };
    orders.push(newOrder);
    saveSalesOrders(orders);
    return res.status(201).json({ message: 'Sales order created', order: newOrder, source: 'mock' });
  }
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const seq = (await client.query('SELECT COUNT(*) FROM sales_orders')).rows[0].count;
      const order_number = `SO-${new Date().getFullYear()}-${String(parseInt(seq) + 1).padStart(4, '0')}`;
      const soRes = await client.query(
        `INSERT INTO sales_orders (order_number, customer_id, order_date, delivery_date, status, subtotal, tax_amount, total_amount, notes, created_by)
         VALUES ($1,$2,$3,$4,'Draft',$5,$6,$7,$8,$9) RETURNING *`,
        [order_number, customer_id, order_date, delivery_date || null, subtotal, tax_amount, total_amount, notes || null, req.user?.id || null]
      );
      for (const item of items) {
        await client.query(
          `INSERT INTO sales_order_items (sales_order_id, product_id, description, quantity, unit_price, tax_rate) VALUES ($1,$2,$3,$4,$5,$6)`,
          [soRes.rows[0].id, item.product_id || null, item.description || '', item.quantity, item.unit_price, item.tax_rate || 0]
        );
      }
      await client.query('COMMIT');
      return res.status(201).json({ message: 'Sales order created successfully', order: soRes.rows[0] });
    } catch (err) { await client.query('ROLLBACK'); throw err; }
    finally { client.release(); }
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to create sales order', error: error.message });
  }
}

export default authenticateToken(handler);
