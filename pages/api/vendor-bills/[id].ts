import { NextApiResponse } from 'next';
import { pool } from '@/lib/db';
import { AuthenticatedRequest, requirePermission } from '@/lib/auth-middleware';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id || typeof id !== 'string') return res.status(400).json({ message: 'Invalid vendor bill ID' });

  if (req.method === 'GET') return handleGet(req, res, id);
  if (req.method === 'PUT') return handleUpdate(req, res, id);
  if (req.method === 'DELETE') return handleDelete(req, res, id);
  return res.status(405).json({ message: 'Method not allowed' });
}

async function handleGet(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  try {
    const billRes = await pool.query(
      `SELECT 
        vb.*,
        (vb.total_amount - vb.paid_amount) as balance_due,
        c.name as vendor_name, c.email as vendor_email, c.mobile as vendor_mobile, c.address as vendor_address,
        po.po_number
       FROM vendor_bills vb
       LEFT JOIN contacts c ON vb.vendor_id = c.id
       LEFT JOIN purchase_orders po ON vb.purchase_order_id = po.id
       WHERE vb.id = $1`,
      [id]
    );
    if (billRes.rows.length === 0) return res.status(404).json({ message: 'Vendor bill not found' });

    const itemsRes = await pool.query(
      `SELECT 
        vbi.*,
        p.product_name, p.sku, p.unit_of_measure
       FROM vendor_bill_items vbi
       LEFT JOIN products p ON vbi.product_id = p.id
       WHERE vbi.vendor_bill_id = $1
       ORDER BY vbi.id ASC`,
      [id]
    );

    const paymentsRes = await pool.query(
      `SELECT * FROM payments WHERE reference_type = 'Bill' AND reference_id = $1 ORDER BY payment_date DESC`,
      [id]
    );

    return res.status(200).json({
      bill: {
        ...billRes.rows[0],
        items: itemsRes.rows,
        payments: paymentsRes.rows,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to fetch vendor bill', error: error.message });
  }
}

async function handleUpdate(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  try {
    const { status, due_date, notes } = req.body;
    const result = await pool.query(
      `UPDATE vendor_bills 
       SET status = COALESCE($1, status),
           due_date = COALESCE($2, due_date),
           notes = COALESCE($3, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 RETURNING *`,
      [status, due_date, notes, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Vendor bill not found' });
    return res.status(200).json({ message: 'Vendor bill updated successfully', bill: result.rows[0] });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to update vendor bill', error: error.message });
  }
}

async function handleDelete(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  try {
    const result = await pool.query(
      `UPDATE vendor_bills SET status = 'Cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Vendor bill not found' });
    return res.status(200).json({ message: 'Vendor bill cancelled successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to cancel vendor bill', error: error.message });
  }
}

export default requirePermission('canCreateTransactions', handler);
