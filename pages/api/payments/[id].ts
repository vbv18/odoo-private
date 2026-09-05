import { NextApiResponse } from 'next';
import { pool } from '@/lib/db';
import { AuthenticatedRequest, authenticateToken } from '@/lib/auth-middleware';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id || typeof id !== 'string') return res.status(400).json({ message: 'Invalid payment ID' });

  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  try {
    const result = await pool.query(
      `SELECT 
        p.*,
        c.name as partner_name, c.email as partner_email, c.mobile as partner_mobile, c.address as partner_address,
        u.name as created_by_name
       FROM payments p
       LEFT JOIN contacts c ON p.partner_id = c.id
       LEFT JOIN users u ON p.created_by = u.id
       WHERE p.id = $1`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Payment not found' });
    return res.status(200).json({ payment: result.rows[0] });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to fetch payment', error: error.message });
  }
}

export default authenticateToken(handler);
