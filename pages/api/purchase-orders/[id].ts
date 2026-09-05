import { NextApiResponse } from 'next';
import { pool } from '@/lib/db';
import { AuthenticatedRequest, requirePermission } from '@/lib/auth-middleware';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id || typeof id !== 'string') return res.status(400).json({ message: 'Invalid purchase order ID' });

  if (req.method === 'GET') return handleGet(req, res, id);
  if (req.method === 'PUT') return handleUpdate(req, res, id);
  if (req.method === 'DELETE') return handleDelete(req, res, id);
  return res.status(405).json({ message: 'Method not allowed' });
}

async function handleGet(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  try {
    const poRes = await pool.query(
      `SELECT 
        po.*,
        c.name as vendor_name, c.email as vendor_email, c.mobile as vendor_mobile, c.address as vendor_address
       FROM purchase_orders po
       LEFT JOIN contacts c ON po.vendor_id = c.id
       WHERE po.id = $1`,
      [id]
    );
    if (poRes.rows.length === 0) return res.status(404).json({ message: 'Purchase order not found' });

    const itemsRes = await pool.query(
      `SELECT 
        poi.*,
        p.product_name, p.sku, p.unit_of_measure
       FROM purchase_order_items poi
       LEFT JOIN products p ON poi.product_id = p.id
       WHERE poi.purchase_order_id = $1
       ORDER BY poi.id ASC`,
      [id]
    );

    return res.status(200).json({
      order: {
        ...poRes.rows[0],
        items: itemsRes.rows,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to fetch purchase order', error: error.message });
  }
}

async function handleUpdate(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  const client = await pool.connect();
  try {
    const { status, notes, expected_delivery_date, items } = req.body;

    await client.query('BEGIN');

    const check = await client.query('SELECT status FROM purchase_orders WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Purchase order not found' });
    }

    if (status) {
      const validStatuses = ['Draft', 'Confirmed', 'Received', 'Cancelled'];
      if (!validStatuses.includes(status)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Invalid status' });
      }
    }

    let subtotal = 0;
    let tax_amount = 0;

    if (items && Array.isArray(items) && items.length > 0) {
      // Re-calculate totals
      for (const item of items) {
        const qty = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.unit_price) || 0;
        const taxRate = parseFloat(item.tax_rate) || 0;
        const lineSub = qty * price;
        subtotal += lineSub;
        tax_amount += (lineSub * taxRate) / 100;
      }
      const total_amount = subtotal + tax_amount;

      await client.query(
        `UPDATE purchase_orders 
         SET status = COALESCE($1, status),
             notes = COALESCE($2, notes),
             expected_delivery_date = $3,
             subtotal = $4,
             tax_amount = $5,
             total_amount = $6,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $7`,
        [status, notes, expected_delivery_date || null, subtotal, tax_amount, total_amount, id]
      );

      // Replace items
      await client.query('DELETE FROM purchase_order_items WHERE purchase_order_id = $1', [id]);
      for (const item of items) {
        await client.query(
          `INSERT INTO purchase_order_items 
            (purchase_order_id, product_id, description, quantity, unit_price, tax_rate)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, item.product_id || null, item.description || '', item.quantity, item.unit_price, item.tax_rate || 0]
        );
      }
    } else {
      await client.query(
        `UPDATE purchase_orders 
         SET status = COALESCE($1, status),
             notes = COALESCE($2, notes),
             expected_delivery_date = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [status, notes, expected_delivery_date || null, id]
      );
    }

    await client.query('COMMIT');
    return res.status(200).json({ message: 'Purchase order updated successfully' });
  } catch (error: any) {
    await client.query('ROLLBACK');
    return res.status(500).json({ message: 'Failed to update purchase order', error: error.message });
  } finally {
    client.release();
  }
}

async function handleDelete(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  try {
    const result = await pool.query(
      `UPDATE purchase_orders SET status = 'Cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Purchase order not found' });
    return res.status(200).json({ message: 'Purchase order cancelled successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to cancel purchase order', error: error.message });
  }
}

export default requirePermission('canCreateTransactions', handler);
