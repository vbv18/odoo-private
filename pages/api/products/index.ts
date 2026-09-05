import { NextApiResponse } from 'next';
import { AuthenticatedRequest, authenticateToken } from '@/lib/auth-middleware';
import { isDbAvailable } from '@/lib/db-safe';
import { getProducts, saveProducts } from '@/lib/mock-data';
import { pool } from '@/lib/db';
import { randomUUID } from 'crypto';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method === 'GET') return handleGet(req, res);
  if (req.method === 'POST') return handleCreate(req, res);
  return res.status(405).json({ message: 'Method not allowed' });
}

async function handleGet(req: AuthenticatedRequest, res: NextApiResponse) {
  const dbOk = await isDbAvailable();
  const { search, archived } = req.query;
  if (!dbOk) {
    let products = getProducts();
    if (search) products = products.filter((p: any) => (p.name || p.product_name || '').toLowerCase().includes((search as string).toLowerCase()) || (p.sku || '').toLowerCase().includes((search as string).toLowerCase()));
    if (archived !== 'true') products = products.filter((p: any) => !p.is_archived);
    return res.status(200).json({ products, total: products.length, source: 'mock' });
  }
  try {
    let query = `SELECT * FROM products WHERE 1=1`;
    const params: any[] = [];
    let n = 1;
    if (search) { query += ` AND (name ILIKE $${n} OR sku ILIKE $${n})`; params.push(`%${search}%`); n++; }
    if (archived !== 'true') query += ` AND is_archived = false`;
    query += ` ORDER BY name ASC`;
    const result = await pool.query(query, params);
    return res.status(200).json({ products: result.rows, total: result.rows.length });
  } catch {
    return res.status(200).json({ products: getProducts(), source: 'mock' });
  }
}

async function handleCreate(req: AuthenticatedRequest, res: NextApiResponse) {
  const { name, sku, category, unit, purchase_price, sale_price, tax_rate } = req.body;
  if (!name) return res.status(400).json({ message: 'Product name is required' });
  const dbOk = await isDbAvailable();
  if (!dbOk) {
    const products = getProducts();
    const newP = { id: randomUUID(), name, sku: sku || null, category: category || null, unit: unit || 'Nos', purchase_price: parseFloat(purchase_price) || 0, sale_price: parseFloat(sale_price) || 0, tax_rate: parseFloat(tax_rate) || 18, is_archived: false, created_at: new Date().toISOString() };
    products.push(newP);
    saveProducts(products);
    return res.status(201).json({ message: 'Product created', product: newP, source: 'mock' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO products (name, sku, category, unit, purchase_price, sale_price, tax_rate, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [name, sku || null, category || null, unit || 'Nos', purchase_price || 0, sale_price || 0, tax_rate || 18, req.user?.id || null]
    );
    return res.status(201).json({ message: 'Product created successfully', product: result.rows[0] });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to create product', error: error.message });
  }
}

export default authenticateToken(handler);
