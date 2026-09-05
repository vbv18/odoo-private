import { NextApiResponse } from 'next';
import { AuthenticatedRequest, authenticateToken } from '@/lib/auth-middleware';
import { isDbAvailable } from '@/lib/db-safe';
import { getPurchaseOrders, savePurchaseOrders } from '@/lib/mock-data';
import { pool } from '@/lib/db';
import { randomUUID } from 'crypto';
import { resolveCreatedBy } from '@/lib/db-users';

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
      (o.po_number || o.order_number || '').toLowerCase().includes((search as string).toLowerCase()) ||
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
    if (search) { query += ` AND (po.po_number ILIKE $${n} OR c.name ILIKE $${n})`; params.push(`%${search}%`); n++; }
    query += ` ORDER BY po.created_at DESC`;
    const result = await pool.query(query, params);
    return res.status(200).json({ orders: result.rows, total: result.rows.length });
  } catch {
    return res.status(200).json({ orders: getPurchaseOrders(), source: 'mock' });
  }
}

async function handleCreate(req: AuthenticatedRequest, res: NextApiResponse) {
  const vendor_id = req.body.vendor_id;
  const po_date = req.body.po_date || req.body.order_date;
  const expected_delivery_date = req.body.expected_delivery_date || req.body.expected_date || null;
  const notes = req.body.notes || null;
  const items = req.body.items;

  if (!vendor_id || !po_date || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'vendor_id, po_date, and items are required' });
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
    const orders = getPurchaseOrders();
    const seq = orders.length + 1;
    const newOrder = {
      id: randomUUID(),
      po_number: `PO-${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`,
      order_number: `PO-${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`,
      vendor_id,
      vendor_name: 'Vendor',
      po_date,
      order_date: po_date,
      expected_delivery_date,
      expected_date: expected_delivery_date,
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
    savePurchaseOrders(orders);
    return res.status(201).json({ message: 'Purchase order created', order: newOrder, source: 'mock' });
  }
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const seq = (await client.query('SELECT COUNT(*) FROM purchase_orders')).rows[0].count;
      const po_number = `PO-${new Date().getFullYear()}-${String(parseInt(seq) + 1).padStart(4, '0')}`;
      let safeVendorId = null;
      if (isValidUuid(vendor_id)) {
        const vendorCheck = await client.query('SELECT 1 FROM contacts WHERE id = $1', [vendor_id]);
        if (vendorCheck.rowCount && vendorCheck.rowCount > 0) {
          safeVendorId = vendor_id;
        }
      }

      const safeCreatedBy = await resolveCreatedBy(req.user?.id, client);

      const poRes = await client.query(
        `INSERT INTO purchase_orders (po_number, vendor_id, po_date, expected_delivery_date, status, subtotal, tax_amount, total_amount, notes, created_by)
         VALUES ($1,$2,$3,$4,'Draft',$5,$6,$7,$8,$9) RETURNING *`,
        [po_number, safeVendorId, po_date, expected_delivery_date, subtotal, tax_amount, total_amount, notes, safeCreatedBy]
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
          `INSERT INTO purchase_order_items (purchase_order_id, product_id, description, quantity, unit_price, tax_rate)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [poRes.rows[0].id, safeProductId, item.description || '', parseFloat(item.quantity) || 0, parseFloat(item.unit_price) || 0, parseFloat(item.tax_rate) || 0]
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
