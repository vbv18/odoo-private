import { NextApiResponse } from 'next';
import { AuthenticatedRequest, authenticateToken } from '@/lib/auth-middleware';
import { isDbAvailable } from '@/lib/db-safe';
import { getCustomerInvoices, saveCustomerInvoices } from '@/lib/mock-data';
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
    let invoices = getCustomerInvoices();
    if (status) invoices = invoices.filter((i: any) => i.status === status);
    if (search) invoices = invoices.filter((i: any) =>
      i.invoice_number.toLowerCase().includes((search as string).toLowerCase()) ||
      (i.customer_name || '').toLowerCase().includes((search as string).toLowerCase())
    );
    return res.status(200).json({ invoices, total: invoices.length, source: 'mock' });
  }
  try {
    const result = await pool.query(`
      SELECT ci.id, ci.invoice_number, ci.invoice_date, ci.due_date,
        ci.status, ci.subtotal, ci.tax_amount, ci.total_amount,
        ci.paid_amount, (ci.total_amount - ci.paid_amount) as balance_due,
        ci.notes, ci.created_at, ci.sales_order_id,
        c.id as customer_id, c.name as customer_name, c.email as customer_email
      FROM customer_invoices ci
      LEFT JOIN contacts c ON ci.customer_id = c.id
      ORDER BY ci.created_at DESC`);
    return res.status(200).json({ invoices: result.rows });
  } catch {
    return res.status(200).json({ invoices: getCustomerInvoices(), source: 'mock' });
  }
}

async function handleCreate(req: AuthenticatedRequest, res: NextApiResponse) {
  const { customer_id, invoice_date, due_date, notes, items } = req.body;
  if (!customer_id || !invoice_date || !due_date || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'customer_id, invoice_date, due_date, and items are required' });
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
    const invoices = getCustomerInvoices();
    const seq = invoices.length + 1;
    const newInvoice = {
      id: randomUUID(), invoice_number: `INV-${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`,
      customer_id, customer_name: 'Customer', customer_email: '',
      invoice_date, due_date, status: 'Draft', subtotal, tax_amount, total_amount,
      paid_amount: 0, balance_due: total_amount, notes: notes || '', sales_order_id: '',
      created_at: new Date().toISOString(),
    };
    invoices.push(newInvoice);
    saveCustomerInvoices(invoices);
    return res.status(201).json({ message: 'Invoice created', invoice: newInvoice, source: 'mock' });
  }
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const seq = (await client.query('SELECT COUNT(*) FROM customer_invoices')).rows[0].count;
      const invoice_number = `INV-${new Date().getFullYear()}-${String(parseInt(seq) + 1).padStart(4, '0')}`;
      const createdBy = await resolveCreatedBy(req.user?.id, client);
      const invRes = await client.query(
        `INSERT INTO customer_invoices (invoice_number, customer_id, invoice_date, due_date, status, subtotal, tax_amount, total_amount, paid_amount, notes, created_by)
         VALUES ($1,$2,$3,$4,'Draft',$5,$6,$7,0,$8,$9) RETURNING *`,
        [invoice_number, customer_id, invoice_date, due_date, subtotal, tax_amount, total_amount, notes || null, createdBy]
      );
      for (const item of items) {
        await client.query(
          `INSERT INTO customer_invoice_items (customer_invoice_id, product_id, description, quantity, unit_price, tax_rate) VALUES ($1,$2,$3,$4,$5,$6)`,
          [invRes.rows[0].id, item.product_id || null, item.description || '', item.quantity, item.unit_price, item.tax_rate || 0]
        );
      }
      await client.query('COMMIT');
      return res.status(201).json({ message: 'Customer invoice created successfully', invoice: invRes.rows[0] });
    } catch (err) { await client.query('ROLLBACK'); throw err; }
    finally { client.release(); }
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to create customer invoice', error: error.message });
  }
}

export default authenticateToken(handler);
