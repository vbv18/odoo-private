import { NextApiResponse } from 'next';
import { pool } from '@/lib/db';
import { AuthenticatedRequest, requirePermission } from '@/lib/auth-middleware';

// GET /api/products/[id] - Get product by ID
// PUT /api/products/[id] - Update product
// DELETE /api/products/[id] - Archive product
async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'Invalid product ID' });
  }

  if (req.method === 'GET') {
    return handleGetProduct(req, res, id);
  } else if (req.method === 'PUT') {
    return handleUpdateProduct(req, res, id);
  } else if (req.method === 'DELETE') {
    return handleArchiveProduct(req, res, id);
  } else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
}

async function handleGetProduct(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  try {
    const result = await pool.query(
      `SELECT * FROM products WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    return res.status(200).json({ product: result.rows[0] });
  } catch (error: any) {
    console.error('Error fetching product:', error);
    return res.status(500).json({ message: 'Failed to fetch product', error: error.message });
  }
}

async function handleUpdateProduct(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  try {
    const {
      product_name,
      product_type,
      sales_price,
      cost_price,
      category,
      description,
      sku,
      stock_quantity,
      unit_of_measure,
    } = req.body;

    if (sku) {
      const existingProduct = await pool.query(
        'SELECT id FROM products WHERE sku = $1 AND id != $2 AND is_archived = false',
        [sku, id]
      );
      if (existingProduct.rows.length > 0) {
        return res.status(400).json({ message: 'SKU already exists' });
      }
    }

    const result = await pool.query(
      `UPDATE products 
      SET 
        product_name = $1,
        product_type = $2,
        sales_price = $3,
        cost_price = $4,
        category = $5,
        description = $6,
        sku = $7,
        stock_quantity = $8,
        unit_of_measure = $9,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *`,
      [
        product_name,
        product_type,
        sales_price,
        cost_price,
        category || null,
        description || null,
        sku || null,
        stock_quantity,
        unit_of_measure,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    return res.status(200).json({
      message: 'Product updated successfully',
      product: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error updating product:', error);
    return res.status(500).json({ message: 'Failed to update product', error: error.message });
  }
}

async function handleArchiveProduct(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  try {
    if (req.user?.role !== 'Admin') {
      return res.status(403).json({ message: 'Only Admin can archive products' });
    }

    const result = await pool.query(
      `UPDATE products 
      SET is_archived = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    return res.status(200).json({
      message: 'Product archived successfully',
      product: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error archiving product:', error);
    return res.status(500).json({ message: 'Failed to archive product', error: error.message });
  }
}

export default requirePermission('canManageMasterData', handler);
