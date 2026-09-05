import { NextApiResponse } from 'next';
import { pool } from '@/lib/db';
import { AuthenticatedRequest, authenticateToken } from '@/lib/auth-middleware';

// GET /api/dashboard/transactions - Fetch recent transactions for the dashboard
// POST /api/dashboard/transactions - Create a quick transaction from the dashboard modal
async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return handleGetTransactions(req, res);
  } else if (req.method === 'POST') {
    return handleCreateTransaction(req, res);
  } else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
}

async function handleGetTransactions(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const { limit = '50' } = req.query;

    const result = await pool.query(`
      SELECT 
        id::text, created_at as date, 'SO' as type, so_number as reference_no,
        customer_name as partner, total_amount as amount, status,
        due_date, notes
      FROM sales_orders
      WHERE is_archived = false

      UNION ALL

      SELECT 
        id::text, created_at as date, 'PO' as type, po_number as reference_no,
        vendor_name as partner, total_amount as amount, status,
        expected_delivery_date as due_date, notes
      FROM purchase_orders
      WHERE is_archived = false

      UNION ALL

      SELECT 
        id::text, created_at as date, 'Invoice' as type, invoice_number as reference_no,
        customer_name as partner, total_amount as amount, status,
        due_date, notes
      FROM customer_invoices
      WHERE is_archived = false

      UNION ALL

      SELECT 
        id::text, created_at as date, 'Bill' as type, bill_number as reference_no,
        vendor_name as partner, total_amount as amount, status,
        due_date, notes
      FROM vendor_bills
      WHERE is_archived = false

      UNION ALL

      SELECT 
        id::text, created_at as date, 'Payment' as type, payment_number as reference_no,
        COALESCE(customer_name, vendor_name, 'General') as partner,
        amount, 'Paid' as status,
        NULL::date as due_date, notes
      FROM payments
      WHERE is_archived = false

      ORDER BY date DESC
      LIMIT $1
    `, [parseInt(limit as string)]);

    return res.status(200).json({ transactions: result.rows });
  } catch (error: any) {
    // Tables may not exist yet — return empty gracefully
    console.error('Dashboard transactions fetch error:', error.message);
    return res.status(200).json({ transactions: [], _error: 'DB tables not yet set up' });
  }
}

async function handleCreateTransaction(req: AuthenticatedRequest, res: NextApiResponse) {
  const { type, partner, amount, dueDate, notes, itemDesc } = req.body;

  if (!type || !partner || !amount) {
    return res.status(400).json({ message: 'type, partner, and amount are required' });
  }

  const parsedAmount = parseFloat(amount) || 0;
  const userId = req.user?.id || null;
  const rand = Math.floor(100 + Math.random() * 900);

  try {
    let result;

    if (type === 'SO') {
      const soNumber = `SO-2026-${rand}`;
      result = await pool.query(
        `INSERT INTO sales_orders 
          (so_number, customer_name, total_amount, status, due_date, notes, created_by)
         VALUES ($1, $2, $3, 'Confirmed', $4, $5, $6)
         RETURNING id::text, so_number as reference_no, 'SO' as type, customer_name as partner,
                   total_amount as amount, status, due_date, notes, created_at as date`,
        [soNumber, partner, parsedAmount, dueDate || null, notes || itemDesc || null, userId]
      );
    } else if (type === 'PO') {
      const poNumber = `PO-2026-${rand}`;
      result = await pool.query(
        `INSERT INTO purchase_orders 
          (po_number, vendor_name, total_amount, status, expected_delivery_date, notes, created_by)
         VALUES ($1, $2, $3, 'Confirmed', $4, $5, $6)
         RETURNING id::text, po_number as reference_no, 'PO' as type, vendor_name as partner,
                   total_amount as amount, status, expected_delivery_date as due_date, notes, created_at as date`,
        [poNumber, partner, parsedAmount, dueDate || null, notes || itemDesc || null, userId]
      );
    } else if (type === 'Invoice') {
      const invNumber = `INV-2026-${rand}`;
      result = await pool.query(
        `INSERT INTO customer_invoices 
          (invoice_number, customer_name, total_amount, status, due_date, notes, created_by)
         VALUES ($1, $2, $3, 'Confirmed', $4, $5, $6)
         RETURNING id::text, invoice_number as reference_no, 'Invoice' as type, customer_name as partner,
                   total_amount as amount, status, due_date, notes, created_at as date`,
        [invNumber, partner, parsedAmount, dueDate || null, notes || itemDesc || null, userId]
      );
    } else if (type === 'Bill') {
      const billNumber = `BILL-2026-${rand}`;
      result = await pool.query(
        `INSERT INTO vendor_bills 
          (bill_number, vendor_name, total_amount, status, due_date, notes, created_by)
         VALUES ($1, $2, $3, 'Confirmed', $4, $5, $6)
         RETURNING id::text, bill_number as reference_no, 'Bill' as type, vendor_name as partner,
                   total_amount as amount, status, due_date, notes, created_at as date`,
        [billNumber, partner, parsedAmount, dueDate || null, notes || itemDesc || null, userId]
      );
    } else if (type === 'Journal') {
      const jeNumber = `JE-2026-${rand}`;
      result = await pool.query(
        `INSERT INTO journal_entries 
          (entry_number, description, total_debit, status, created_by)
         VALUES ($1, $2, $3, 'Draft', $4)
         RETURNING id::text, entry_number as reference_no, 'Journal' as type, 
                   description as partner, total_debit as amount, status,
                   NULL::date as due_date, description as notes, created_at as date`,
        [jeNumber, notes || itemDesc || `Journal entry for ${partner}`, parsedAmount, userId]
      );
    } else {
      return res.status(400).json({ message: 'Invalid transaction type' });
    }

    return res.status(201).json({
      message: 'Transaction created successfully',
      transaction: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error creating dashboard transaction:', error.message);
    return res.status(500).json({ message: 'Failed to create transaction', error: error.message });
  }
}

export default authenticateToken(handler);
