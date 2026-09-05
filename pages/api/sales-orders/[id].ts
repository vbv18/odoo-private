import { NextApiResponse } from 'next';
import { pool } from '@/lib/db';
import { AuthenticatedRequest, requirePermission } from '@/lib/auth-middleware';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id || typeof id !== 'string') return res.status(400).json({ message: 'Invalid sales order ID' });

  if (req.method === 'GET') return handleGet(req, res, id);
  if (req.method === 'PUT') return handleUpdate(req, res, id);
  if (req.method === 'DELETE') return handleDelete(req, res, id);
  return res.status(405).json({ message: 'Method not allowed' });
}

async function handleGet(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  try {
    const soRes = await pool.query(
      `SELECT 
        so.*,
        c.name as customer_name, c.email as customer_email, c.mobile as customer_mobile, c.address as customer_address
       FROM sales_orders so
       LEFT JOIN contacts c ON so.customer_id = c.id
       WHERE so.id = $1`,
      [id]
    );
    if (soRes.rows.length === 0) return res.status(404).json({ message: 'Sales order not found' });

    const itemsRes = await pool.query(
      `SELECT 
        soi.*,
        p.product_name, p.sku, p.unit_of_measure
       FROM sales_order_items soi
       LEFT JOIN products p ON soi.product_id = p.id
       WHERE soi.sales_order_id = $1
       ORDER BY soi.id ASC`,
      [id]
    );

    return res.status(200).json({
      order: {
        ...soRes.rows[0],
        items: itemsRes.rows,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to fetch sales order', error: error.message });
  }
}

async function handleUpdate(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  const client = await pool.connect();
  try {
    const { status, notes, expected_delivery_date, items } = req.body;

    await client.query('BEGIN');

    const check = await client.query('SELECT status FROM sales_orders WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Sales order not found' });
    }

    if (status) {
      const validStatuses = ['Draft', 'Confirmed', 'Delivered', 'Cancelled'];
      if (!validStatuses.includes(status)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Invalid status' });
      }
    }

    let subtotal = 0;
    let tax_amount = 0;

    if (items && Array.isArray(items) && items.length > 0) {
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
        `UPDATE sales_orders 
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

      await client.query('DELETE FROM sales_order_items WHERE sales_order_id = $1', [id]);
      for (const item of items) {
        await client.query(
          `INSERT INTO sales_order_items 
            (sales_order_id, product_id, description, quantity, unit_price, tax_rate)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, item.product_id || null, item.description || '', item.quantity, item.unit_price, item.tax_rate || 0]
        );
      }
    } else {
      await client.query(
        `UPDATE sales_orders 
         SET status = COALESCE($1, status),
             notes = COALESCE($2, notes),
             expected_delivery_date = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [status, notes, expected_delivery_date || null, id]
      );
    }

    await client.query('COMMIT');
    return res.status(200).json({ message: 'Sales order updated successfully' });
  } catch (error: any) {
    await client.query('ROLLBACK');
    return res.status(500).json({ message: 'Failed to update sales order', error: error.message });
  } finally {
    client.release();
  }
}

async function handleDelete(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  try {
    const result = await pool.query(
      `UPDATE sales_orders SET status = 'Cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Sales order not found' });
    return res.status(200).json({ message: 'Sales order cancelled successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to cancel sales order', error: error.message });
  }
}

export default requirePermission('canCreateTransactions', handler);
