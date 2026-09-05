import { NextApiResponse } from 'next';
import { pool } from '@/lib/db';
import { AuthenticatedRequest, authenticateToken } from '@/lib/auth-middleware';
import { getStoredPayments, saveStoredPayment } from '@/lib/payments-store';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method === 'GET') return handleGet(req, res);
  if (req.method === 'POST') return handleCreate(req, res);
  return res.status(405).json({ message: 'Method not allowed' });
}

async function handleGet(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const { type, limit } = req.query;
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
    if (limit && !isNaN(Number(limit))) {
      query += ` LIMIT ${parseInt(limit as string, 10)}`;
    }

    const result = await pool.query(query, params);
    return res.status(200).json({ payments: result.rows });
  } catch (error: any) {
    const { type, limit } = req.query;
    let stored = getStoredPayments(type as string | undefined);
    if (limit && !isNaN(Number(limit))) {
      stored = stored.slice(0, parseInt(limit as string, 10));
    }
    return res.status(200).json({ payments: stored });
  }
}

async function handleCreate(req: AuthenticatedRequest, res: NextApiResponse) {
  const { payment_type, payment_method, partner_id, payment_date, amount, reference_number, notes, partner_name } = req.body;
  const parsedAmount = parseFloat(amount);
  if (!payment_type || !parsedAmount || parsedAmount <= 0) {
    return res.status(400).json({ message: 'payment_type and a positive amount are required' });
  }

  const effectivePartnerId = partner_id || null;
  const effectivePartnerName = partner_name || req.user?.name || req.user?.loginId || 'Customer';

  try {
    const client = await pool.connect();
    try {
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
          payment_method || 'Bank Transfer',
          effectivePartnerId,
          payment_date || new Date().toISOString().split('T')[0],
          parsedAmount,
          reference_number || null,
          notes || null,
          req.user?.id || null,
        ]
      );

      await client.query('COMMIT');
      return res.status(201).json({ message: 'Payment recorded successfully', payment: payRes.rows[0] });
    } catch (err: any) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
    // Fallback: save to local store
    const payment = saveStoredPayment({
      payment_type,
      payment_method: payment_method || 'Bank Transfer',
      partner_id: effectivePartnerId,
      partner_name: effectivePartnerName,
      partner_email: req.user?.email || null,
      payment_date: payment_date || new Date().toISOString().split('T')[0],
      amount: parsedAmount,
      reference_type: 'Manual',
      reference_number: reference_number || null,
      notes: notes || null,
      created_by: req.user?.id || null,
    });
    return res.status(201).json({ message: 'Payment recorded successfully', payment });
  }
}

export default authenticateToken(handler);
