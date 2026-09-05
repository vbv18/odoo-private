import { NextApiResponse } from 'next';
import { AuthenticatedRequest, authenticateToken } from '@/lib/auth-middleware';
import { isDbAvailable } from '@/lib/db-safe';
import { getProducts, saveProducts } from '@/lib/mock-data';
import { pool } from '@/lib/db';
import { randomUUID } from 'crypto';

export function normalizeProduct(p: any) {
  const name = p.product_name || p.name || '';
  const sale_price = parseFloat(p.sales_price ?? p.sale_price ?? 0) || 0;
  const purchase_price = parseFloat(p.cost_price ?? p.purchase_price ?? 0) || 0;
  const stock_quantity = parseFloat(p.stock_quantity ?? p.stock ?? 0) || 0;
  const product_type = p.product_type || 'Goods';
  const unit = p.unit_of_measure || p.unit || 'Unit';

  return {
    ...p,
    id: p.id,
    name,
    product_name: name,
    sale_price,
    sales_price: sale_price,
    purchase_price,
    cost_price: purchase_price,
    stock_quantity,
    stock: stock_quantity,
    product_type,
    category: p.category || '',
    sku: p.sku || '',
    unit,
    unit_of_measure: unit,
    tax_rate: parseFloat(p.tax_rate ?? 18) || 18,
    description: p.description || '',
    is_archived: Boolean(p.is_archived),
    created_at: p.created_at || new Date().toISOString(),
  };
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method === 'GET') return handleGet(req, res);
  if (req.method === 'POST') return handleCreate(req, res);
  return res.status(405).json({ message: 'Method not allowed' });
}

async function handleGet(req: AuthenticatedRequest, res: NextApiResponse) {
  const dbOk = await isDbAvailable();
  const { search, archived, type } = req.query;

  if (!dbOk) {
    let products = getProducts().map(normalizeProduct);
    if (search) {
      const q = (search as string).toLowerCase();
      products = products.filter((p: any) =>
        (p.product_name || '').toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q)
      );
    }
    if (type) {
      products = products.filter((p: any) => p.product_type === type);
    }
    if (archived !== 'true') products = products.filter((p: any) => !p.is_archived);
    return res.status(200).json({ products, total: products.length, source: 'mock' });
  }

  try {
    let query = `SELECT * FROM products WHERE 1=1`;
    const params: any[] = [];
    let n = 1;
    if (search) {
      query += ` AND (product_name ILIKE $${n} OR sku ILIKE $${n})`;
      params.push(`%${search}%`);
      n++;
    }
    if (type) {
      query += ` AND product_type = $${n}`;
      params.push(type);
      n++;
    }
    if (archived !== 'true') query += ` AND is_archived = false`;
    query += ` ORDER BY product_name ASC`;
    const result = await pool.query(query, params);
    const normalized = result.rows.map(normalizeProduct);
    return res.status(200).json({ products: normalized, total: normalized.length });
  } catch {
    const products = getProducts().map(normalizeProduct);
    return res.status(200).json({ products, source: 'mock' });
  }
}

async function handleCreate(req: AuthenticatedRequest, res: NextApiResponse) {
  const name = req.body.product_name || req.body.name;
  if (!name) return res.status(400).json({ message: 'Product name is required' });

  const sku = req.body.sku || null;
  const category = req.body.category || null;
  const unit_of_measure = req.body.unit_of_measure || req.body.unit || 'Unit';
  const sales_price = parseFloat(req.body.sales_price ?? req.body.sale_price) || 0;
  const cost_price = parseFloat(req.body.cost_price ?? req.body.purchase_price) || 0;
  const tax_rate = parseFloat(req.body.tax_rate) || 18;
  const product_type = req.body.product_type || 'Goods';
  const description = req.body.description || null;
  const stock_quantity = parseFloat(req.body.stock_quantity ?? req.body.stock) || 0;

  const dbOk = await isDbAvailable();
  if (!dbOk) {
    const products = getProducts();
    const newP = normalizeProduct({
      id: randomUUID(),
      product_name: name,
      name,
      sku,
      category,
      unit_of_measure,
      unit: unit_of_measure,
      sales_price,
      sale_price: sales_price,
      cost_price,
      purchase_price: cost_price,
      tax_rate,
      product_type,
      description,
      stock_quantity,
      stock: stock_quantity,
      is_archived: false,
      created_at: new Date().toISOString(),
    });
    products.push(newP);
    saveProducts(products);
    return res.status(201).json({ message: 'Product created', product: newP, source: 'mock' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO products (product_name, sku, category, unit_of_measure, sales_price, cost_price, product_type, description, stock_quantity)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [name, sku, category, unit_of_measure, sales_price, cost_price, product_type, description, stock_quantity]
    );
    return res.status(201).json({ message: 'Product created successfully', product: normalizeProduct(result.rows[0]) });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to create product', error: error.message });
  }
}

export default authenticateToken(handler);
