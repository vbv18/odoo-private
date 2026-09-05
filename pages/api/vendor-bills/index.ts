import { NextApiResponse } from 'next';
import { pool } from '@/lib/db';
import { AuthenticatedRequest, authenticateToken } from '@/lib/auth-middleware';

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
    const bills = result.rows.map(b => ({
      ...b,
      subtotal: parseFloat(b.subtotal) || 0,
      tax_amount: parseFloat(b.tax_amount) || 0,
      total_amount: parseFloat(b.total_amount) || 0,
      paid_amount: parseFloat(b.paid_amount) || 0,
      balance_due: parseFloat(b.balance_due) || 0,
    }));
    return res.status(200).json({ bills });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to fetch vendor bills', error: error.message });
  }
}

async function handleCreate(req: AuthenticatedRequest, res: NextApiResponse) {
  const client = await pool.connect();
  try {
    const { vendor_id, bill_date, due_date, notes, items, status } = req.body;
    if (!bill_date || !due_date || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'bill_date, due_date, and items are required' });
    }

    // Validate UUID for vendor_id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let finalVendorId = vendor_id && uuidRegex.test(vendor_id) ? vendor_id : null;
    if (!finalVendorId) {
      const vRes = await client.query("SELECT id FROM contacts WHERE type = 'Vendor' OR type = 'Both' LIMIT 1");
      finalVendorId = vRes.rows[0]?.id || null;
      if (!finalVendorId) {
        const anyRes = await client.query("SELECT id FROM contacts LIMIT 1");
        finalVendorId = anyRes.rows[0]?.id || '5e6ddab9-30f8-4eee-a3de-9170066a63f3';
      }
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
    const finalStatus = status || 'Draft';
    const paid_amount = finalStatus === 'Paid' ? total_amount : 0;

    const billRes = await client.query(
      `INSERT INTO vendor_bills 
        (bill_number, vendor_id, bill_date, due_date, status, subtotal, tax_amount, total_amount, paid_amount, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [bill_number, finalVendorId, bill_date, due_date, finalStatus, subtotal, tax_amount, total_amount, paid_amount, notes || null, req.user?.id || null]
    );

    const bill = billRes.rows[0];

    for (const item of items) {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      const taxRate = parseFloat(item.tax_rate) || 0;
      await client.query(
        `INSERT INTO vendor_bill_items 
          (vendor_bill_id, product_id, description, quantity, unit_price, tax_rate)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [bill.id, item.product_id || null, item.description || '', qty, price, taxRate]
      );
    }

    await client.query('COMMIT');
    return res.status(201).json({
      message: 'Vendor bill created successfully',
      bill: {
        ...bill,
        subtotal: parseFloat(bill.subtotal) || 0,
        tax_amount: parseFloat(bill.tax_amount) || 0,
        total_amount: parseFloat(bill.total_amount) || 0,
        paid_amount: parseFloat(bill.paid_amount) || 0,
        balance_due: (parseFloat(bill.total_amount) || 0) - (parseFloat(bill.paid_amount) || 0),
      }
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    return res.status(500).json({ message: 'Failed to create vendor bill', error: error.message });
  } finally {
    client.release();
  }
}

export default authenticateToken(handler);
