import { NextApiResponse } from 'next';
import { pool } from '@/lib/db';
import { AuthenticatedRequest, authenticateToken } from '@/lib/auth-middleware';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method === 'GET') return handleGet(req, res);
  if (req.method === 'POST') return handleCreate(req, res);
  return res.status(405).json({ message: 'Method not allowed' });
}

async function handleGet(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const { type } = req.query;
    let query = `
      SELECT 
        p.*,
        c.name as partner_name, c.email as partner_email, c.contact_type
      FROM payments p
      LEFT JOIN contacts c ON p.partner_id = c.id
    `;
    const params: any[] = [];
    if (type && (type === 'Receipt' || type === 'Payment')) {
      query += ` WHERE p.payment_type = $1`;
      params.push(type);
    }
    query += ` ORDER BY p.payment_date DESC, p.created_at DESC`;

    const result = await pool.query(query, params);
    return res.status(200).json({ payments: result.rows });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to fetch payments', error: error.message });
  }
}

async function handleCreate(req: AuthenticatedRequest, res: NextApiResponse) {
  const client = await pool.connect();
  try {
    const { payment_type, payment_method, partner_id, payment_date, amount, reference_number, notes } = req.body;
    const parsedAmount = parseFloat(amount);
    if (!payment_type || !partner_id || !parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({ message: 'payment_type, partner_id, and positive amount are required' });
    }

    await client.query('BEGIN');

    const prefix = payment_type === 'Receipt' ? 'REC' : 'PAY';
    const countRes = await client.query('SELECT COUNT(*) FROM payments');
    const seq = parseInt(countRes.rows[0].count, 10) + 1;
    const payment_number = `${prefix}-${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`;

    const payRes = await client.query(
      `INSERT INTO payments 
        (payment_number, payment_type, payment_method, partner_id, payment_date, amount, reference_type, reference_number, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, 'Manual', $7, $8, $9)
       RETURNING *`,
      [
        payment_number,
        payment_type,
        payment_method || 'Bank',
        partner_id,
        payment_date || new Date().toISOString().split('T')[0],
        parsedAmount,
        reference_number || null,
        notes || null,
        req.user?.id || null,
      ]
    );

    await client.query('COMMIT');
    return res.status(201).json({ message: 'Payment recorded successfully', payment: payRes.rows[0] });
  } catch (error: any) {
    await client.query('ROLLBACK');
    return res.status(500).json({ message: 'Failed to record payment', error: error.message });
  } finally {
    client.release();
  }
}

export default authenticateToken(handler);
