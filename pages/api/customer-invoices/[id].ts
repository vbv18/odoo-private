import { NextApiResponse } from 'next';
import { pool } from '@/lib/db';
import { AuthenticatedRequest, authenticateToken } from '@/lib/auth-middleware';
import { getStoredInvoiceById, updateStoredInvoice } from '@/lib/invoices-store';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id || typeof id !== 'string') return res.status(400).json({ message: 'Invalid customer invoice ID' });

  if (req.method === 'GET') return handleGet(req, res, id);
  if (req.method === 'PUT') return handleUpdate(req, res, id);
  if (req.method === 'DELETE') return handleDelete(req, res, id);
  return res.status(405).json({ message: 'Method not allowed' });
}

async function handleGet(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  try {
    const invRes = await pool.query(
      `SELECT 
        ci.*,
        (ci.total_amount - ci.paid_amount) as balance_due,
        c.name as customer_name, c.email as customer_email, c.mobile as customer_mobile, c.address as customer_address,
        so.so_number
       FROM customer_invoices ci
       LEFT JOIN contacts c ON ci.customer_id = c.id
       LEFT JOIN sales_orders so ON ci.sales_order_id = so.id
       WHERE ci.id = $1`,
      [id]
    );

    if (invRes.rows.length > 0) {
      const itemsRes = await pool.query(
        `SELECT 
          cii.*,
          p.product_name, p.sku, p.unit_of_measure
         FROM customer_invoice_items cii
         LEFT JOIN products p ON cii.product_id = p.id
         WHERE cii.customer_invoice_id = $1
         ORDER BY cii.id ASC`,
        [id]
      );

      const paymentsRes = await pool.query(
        `SELECT * FROM payments WHERE reference_type = 'Invoice' AND reference_id = $1 ORDER BY payment_date DESC`,
        [id]
      );

      return res.status(200).json({
        invoice: {
          ...invRes.rows[0],
          items: itemsRes.rows,
          payments: paymentsRes.rows,
        },
      });
    }
  } catch (error: any) {
    // DB query error, fall through to storage fallback
  }

  // Fallback to local storage
  const stored = getStoredInvoiceById(id);
  if (stored) {
    return res.status(200).json({ invoice: stored });
  }

  return res.status(404).json({ message: 'Customer invoice not found' });
}

async function handleUpdate(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  try {
    const { status, due_date, notes } = req.body;
    const result = await pool.query(
      `UPDATE customer_invoices 
       SET status = COALESCE($1, status),
           due_date = COALESCE($2, due_date),
           notes = COALESCE($3, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 RETURNING *`,
      [status, due_date, notes, id]
    );
    if (result.rows.length > 0) {
      return res.status(200).json({ message: 'Customer invoice updated successfully', invoice: result.rows[0] });
    }
  } catch (error: any) {
    // DB query error, fall through
  }

  const updated = updateStoredInvoice(id, req.body);
  if (updated) {
    return res.status(200).json({ message: 'Customer invoice updated successfully', invoice: updated });
  }

  return res.status(404).json({ message: 'Customer invoice not found' });
}

async function handleDelete(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  try {
    const result = await pool.query(
      `UPDATE customer_invoices SET status = 'Cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id]
    );
    if (result.rows.length > 0) {
      return res.status(200).json({ message: 'Customer invoice cancelled successfully' });
    }
  } catch (error: any) {
    // DB query error, fall through
  }

  const updated = updateStoredInvoice(id, { status: 'Cancelled' });
  if (updated) {
    return res.status(200).json({ message: 'Customer invoice cancelled successfully' });
  }

  return res.status(404).json({ message: 'Customer invoice not found' });
}

export default authenticateToken(handler);
