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
        ci.id, ci.invoice_number, ci.invoice_date, ci.due_date,
        ci.status, ci.subtotal, ci.tax_amount, ci.total_amount,
        ci.paid_amount, (ci.total_amount - ci.paid_amount) as balance_due,
        ci.notes, ci.created_at, ci.sales_order_id,
        c.id as customer_id, c.name as customer_name, c.email as customer_email
      FROM customer_invoices ci
      LEFT JOIN contacts c ON ci.customer_id = c.id
      ORDER BY ci.created_at DESC
    `);
    return res.status(200).json({ invoices: result.rows });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to fetch customer invoices', error: error.message });
  }
}

async function handleCreate(req: AuthenticatedRequest, res: NextApiResponse) {
  const client = await pool.connect();
  try {
    const { customer_id, invoice_date, due_date, notes, items } = req.body;
    if (!customer_id || !invoice_date || !due_date || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'customer_id, invoice_date, due_date, and items are required' });
    }

    await client.query('BEGIN');

    const countRes = await client.query('SELECT COUNT(*) FROM customer_invoices');
    const seq = parseInt(countRes.rows[0].count, 10) + 1;
    const invoice_number = `INV-${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`;

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

    const invRes = await client.query(
      `INSERT INTO customer_invoices 
        (invoice_number, customer_id, invoice_date, due_date, status, subtotal, tax_amount, total_amount, paid_amount, notes, created_by)
       VALUES ($1, $2, $3, $4, 'Draft', $5, $6, $7, 0, $8, $9)
       RETURNING *`,
      [invoice_number, customer_id, invoice_date, due_date, subtotal, tax_amount, total_amount, notes || null, req.user?.id || null]
    );

    const invoice = invRes.rows[0];

    for (const item of items) {
      await client.query(
        `INSERT INTO customer_invoice_items 
          (customer_invoice_id, product_id, description, quantity, unit_price, tax_rate)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [invoice.id, item.product_id || null, item.description || '', item.quantity, item.unit_price, item.tax_rate || 0]
      );
    }

    await client.query('COMMIT');
    return res.status(201).json({ message: 'Customer invoice created successfully', invoice });
  } catch (error: any) {
    await client.query('ROLLBACK');
    return res.status(500).json({ message: 'Failed to create customer invoice', error: error.message });
  } finally {
    client.release();
  }
}

export default requirePermission('canCreateTransactions', handler);
