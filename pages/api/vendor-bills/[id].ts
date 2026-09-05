import { NextApiResponse } from 'next';
import { pool } from '@/lib/db';
import { AuthenticatedRequest, authenticateToken } from '@/lib/auth-middleware';

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

    const rawBill = billRes.rows[0];
    const totalAmount = parseFloat(rawBill.total_amount) || 0;
    const paidAmount = parseFloat(rawBill.paid_amount) || 0;

    return res.status(200).json({
      bill: {
        ...rawBill,
        subtotal: parseFloat(rawBill.subtotal) || 0,
        tax_amount: parseFloat(rawBill.tax_amount) || 0,
        total_amount: totalAmount,
        paid_amount: paidAmount,
        balance_due: totalAmount - paidAmount,
        items: itemsRes.rows.map(item => ({
          ...item,
          quantity: parseFloat(item.quantity) || 0,
          unit_price: parseFloat(item.unit_price) || 0,
          tax_rate: parseFloat(item.tax_rate) || 0,
          line_total: parseFloat(item.line_total) || 0,
        })),
        payments: paymentsRes.rows.map(pay => ({
          ...pay,
          amount: parseFloat(pay.amount) || 0,
        })),
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

export default authenticateToken(handler);
