import { NextApiResponse } from 'next';
import { pool } from '@/lib/db';
import { AuthenticatedRequest, requirePermission } from '@/lib/auth-middleware';

// GET /api/products - List all products
// POST /api/products - Create new product
async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return handleGetProducts(req, res);
  } else if (req.method === 'POST') {
    return handleCreateProduct(req, res);
  } else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
}

async function handleGetProducts(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const { type, category, search, archived } = req.query;
    
    let query = `
      SELECT 
        id, product_name, product_type, sales_price, cost_price, 
        category, sku, stock_quantity, unit_of_measure, is_archived, created_at
      FROM products
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (type) {
      query += ` AND product_type = $${paramCount}`;
      params.push(type);
      paramCount++;
    }

    if (category) {
      query += ` AND category = $${paramCount}`;
      params.push(category);
      paramCount++;
    }

    if (search) {
      query += ` AND (product_name ILIKE $${paramCount} OR sku ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    if (archived !== 'true') {
      query += ` AND is_archived = false`;
    }

    query += ` ORDER BY product_name ASC`;

    const result = await pool.query(query, params);

    return res.status(200).json({
      products: result.rows,
      total: result.rows.length,
    });
  } catch (error: any) {
    console.error('Error fetching products:', error);
    return res.status(500).json({ message: 'Failed to fetch products', error: error.message });
  }
}

async function handleCreateProduct(req: AuthenticatedRequest, res: NextApiResponse) {
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

    // Validation
    if (!product_name || !product_type) {
      return res.status(400).json({ message: 'Product name and type are required' });
    }

    if (!['Goods', 'Service', 'Combo'].includes(product_type)) {
      return res.status(400).json({ message: 'Invalid product type' });
    }

    if (sales_price < 0 || cost_price < 0) {
      return res.status(400).json({ message: 'Prices cannot be negative' });
    }

    if (sku) {
      // Check if SKU already exists
      const existingProduct = await pool.query(
        'SELECT id FROM products WHERE sku = $1 AND is_archived = false',
        [sku]
      );
      if (existingProduct.rows.length > 0) {
        return res.status(400).json({ message: 'SKU already exists' });
      }
    }

    const result = await pool.query(
      `INSERT INTO products 
        (product_name, product_type, sales_price, cost_price, category, description, sku, stock_quantity, unit_of_measure, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        product_name,
        product_type,
        sales_price || 0,
        cost_price || 0,
        category || null,
        description || null,
        sku || null,
        stock_quantity || 0,
        unit_of_measure || 'Unit',
        req.user?.id || null,
      ]
    );

    return res.status(201).json({
      message: 'Product created successfully',
      product: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error creating product:', error);
    return res.status(500).json({ message: 'Failed to create product', error: error.message });
  }
}

export default requirePermission('canManageMasterData', handler);
