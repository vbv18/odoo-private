import { NextApiResponse } from 'next';
import { AuthenticatedRequest, authenticateToken } from '@/lib/auth-middleware';
import { isDbAvailable } from '@/lib/db-safe';
import { getVendorBills, saveVendorBills } from '@/lib/mock-data';
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
    let bills = getVendorBills();
    if (status) bills = bills.filter((b: any) => b.status === status);
    if (search) bills = bills.filter((b: any) =>
      b.bill_number.toLowerCase().includes((search as string).toLowerCase()) ||
      (b.vendor_name || '').toLowerCase().includes((search as string).toLowerCase())
    );
    return res.status(200).json({ bills, total: bills.length, source: 'mock' });
  }
  try {
    const result = await pool.query(`
      SELECT vb.id, vb.bill_number, vb.bill_date, vb.due_date, vb.status,
        vb.subtotal, vb.tax_amount, vb.total_amount, vb.paid_amount,
        (vb.total_amount - vb.paid_amount) as balance_due,
        vb.notes, vb.created_at, vb.purchase_order_id,
        c.id as vendor_id, c.name as vendor_name, c.email as vendor_email
      FROM vendor_bills vb
      LEFT JOIN contacts c ON vb.vendor_id = c.id
      ORDER BY vb.created_at DESC`);
    return res.status(200).json({ bills: result.rows });
  } catch {
    return res.status(200).json({ bills: getVendorBills(), source: 'mock' });
  }
}

async function handleCreate(req: AuthenticatedRequest, res: NextApiResponse) {
  const { vendor_id, bill_date, due_date, notes, items } = req.body;
  if (!vendor_id || !bill_date || !due_date || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'vendor_id, bill_date, due_date, and items are required' });
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
    const bills = getVendorBills();
    const seq = bills.length + 1;
    const newBill = {
      id: randomUUID(), bill_number: `BILL-${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`,
      vendor_id, vendor_name: 'Vendor', vendor_email: '',
      bill_date, due_date, status: 'Draft', subtotal, tax_amount, total_amount,
      paid_amount: 0, balance_due: total_amount, notes: notes || '', purchase_order_id: '',
      created_at: new Date().toISOString(),
    };
    bills.push(newBill);
    saveVendorBills(bills);
    return res.status(201).json({ message: 'Bill created', bill: newBill, source: 'mock' });
  }
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const seq = (await client.query('SELECT COUNT(*) FROM vendor_bills')).rows[0].count;
      const bill_number = `BILL-${new Date().getFullYear()}-${String(parseInt(seq) + 1).padStart(4, '0')}`;
      const createdBy = await resolveCreatedBy(req.user?.id, client);
      const billRes = await client.query(
        `INSERT INTO vendor_bills (bill_number, vendor_id, bill_date, due_date, status, subtotal, tax_amount, total_amount, paid_amount, notes, created_by)
         VALUES ($1,$2,$3,$4,'Draft',$5,$6,$7,0,$8,$9) RETURNING *`,
        [bill_number, vendor_id, bill_date, due_date, subtotal, tax_amount, total_amount, notes || null, createdBy]
      );
      for (const item of items) {
        await client.query(
          `INSERT INTO vendor_bill_items (vendor_bill_id, product_id, description, quantity, unit_price, tax_rate) VALUES ($1,$2,$3,$4,$5,$6)`,
          [billRes.rows[0].id, item.product_id || null, item.description || '', item.quantity, item.unit_price, item.tax_rate || 0]
        );
      }
      await client.query('COMMIT');
      return res.status(201).json({ message: 'Vendor bill created successfully', bill: billRes.rows[0] });
    } catch (err) { await client.query('ROLLBACK'); throw err; }
    finally { client.release(); }
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to create vendor bill', error: error.message });
  }
}

export default authenticateToken(handler);
