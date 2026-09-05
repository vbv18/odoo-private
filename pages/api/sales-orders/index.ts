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
      (o.so_number || o.order_number || '').toLowerCase().includes((search as string).toLowerCase()) ||
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
    if (search) { query += ` AND (so.so_number ILIKE $${n} OR c.name ILIKE $${n})`; params.push(`%${search}%`); n++; }
    query += ` ORDER BY so.created_at DESC`;
    const result = await pool.query(query, params);
    return res.status(200).json({ orders: result.rows, total: result.rows.length });
  } catch {
    return res.status(200).json({ orders: getSalesOrders(), source: 'mock' });
  }
}

async function handleCreate(req: AuthenticatedRequest, res: NextApiResponse) {
  const customer_id = req.body.customer_id;
  const so_date = req.body.so_date || req.body.order_date;
  const expected_delivery_date = req.body.expected_delivery_date || req.body.delivery_date || null;
  const notes = req.body.notes || null;
  const items = req.body.items;

  if (!customer_id || !so_date || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'customer_id, so_date, and items are required' });
  }
  let subtotal = 0, tax_amount = 0;
  for (const item of items) {
    const lineSub = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
    subtotal += lineSub;
    tax_amount += (lineSub * (parseFloat(item.tax_rate) || 0)) / 100;
  }
  const total_amount = subtotal + tax_amount;

  const isValidUuid = (val: any) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

  const dbOk = await isDbAvailable();
  if (!dbOk) {
    const orders = getSalesOrders();
    const seq = orders.length + 1;
    const newOrder = {
      id: randomUUID(),
      so_number: `SO-${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`,
      order_number: `SO-${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`,
      customer_id,
      customer_name: 'Customer',
      so_date,
      order_date: so_date,
      expected_delivery_date,
      delivery_date: expected_delivery_date,
      status: 'Draft',
      subtotal,
      tax_amount,
      total_amount,
      notes,
      created_at: new Date().toISOString(),
      items: items.map((it: any) => ({
        ...it,
        id: randomUUID(),
        line_total: (parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0),
      })),
    };
    orders.push(newOrder);
    saveSalesOrders(orders);
    return res.status(201).json({ message: 'Sales order created', order: newOrder, source: 'mock' });
  }
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const seq = (await client.query('SELECT COUNT(*) FROM sales_orders')).rows[0].count;
      const so_number = `SO-${new Date().getFullYear()}-${String(parseInt(seq) + 1).padStart(4, '0')}`;
      let safeCustomerId = null;
      if (isValidUuid(customer_id)) {
        const customerCheck = await client.query('SELECT 1 FROM contacts WHERE id = $1', [customer_id]);
        if (customerCheck.rowCount && customerCheck.rowCount > 0) {
          safeCustomerId = customer_id;
        }
      }

      const safeCreatedBy: string | null = req.user?.id && isValidUuid(req.user.id) ? req.user.id : null;

      const soRes = await client.query(
        `INSERT INTO sales_orders (so_number, customer_id, so_date, expected_delivery_date, status, subtotal, tax_amount, total_amount, notes, created_by)
         VALUES ($1,$2,$3,$4,'Draft',$5,$6,$7,$8,$9) RETURNING *`,
        [so_number, safeCustomerId, so_date, expected_delivery_date, subtotal, tax_amount, total_amount, notes, safeCreatedBy]
      );
      for (const item of items) {
        let safeProductId = null;
        if (isValidUuid(item.product_id)) {
          const productCheck = await client.query('SELECT 1 FROM products WHERE id = $1', [item.product_id]);
          if (productCheck.rowCount && productCheck.rowCount > 0) {
            safeProductId = item.product_id;
          }
        }
        await client.query(
          `INSERT INTO sales_order_items (sales_order_id, product_id, description, quantity, unit_price, tax_rate)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [soRes.rows[0].id, safeProductId, item.description || '', parseFloat(item.quantity) || 0, parseFloat(item.unit_price) || 0, parseFloat(item.tax_rate) || 0]
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
