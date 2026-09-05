import { NextApiResponse } from 'next';
import { AuthenticatedRequest, authenticateToken } from '@/lib/auth-middleware';
import { isDbAvailable } from '@/lib/db-safe';
import { getPayments, savePayments } from '@/lib/mock-data';
import { pool } from '@/lib/db';
import { randomUUID } from 'crypto';
import { resolveCreatedBy } from '@/lib/db-users';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method === 'GET') return handleGet(req, res);
  if (req.method === 'POST') return handleCreate(req, res);
  return res.status(405).json({ message: 'Method not allowed' });
}

async function handleGet(req: AuthenticatedRequest, res: NextApiResponse) {
  const dbOk = await isDbAvailable();
  const { type, search } = req.query;
  if (!dbOk) {
    let payments = getPayments();
    if (type && (type === 'Receipt' || type === 'Payment')) payments = payments.filter((p: any) => p.payment_type === type);
    if (search) payments = payments.filter((p: any) =>
      p.payment_number.toLowerCase().includes((search as string).toLowerCase()) ||
      (p.partner_name || '').toLowerCase().includes((search as string).toLowerCase())
    );
    return res.status(200).json({ payments, total: payments.length, source: 'mock' });
  }
  try {
    let query = `
      SELECT p.*, c.name as partner_name, c.email as partner_email, c.contact_type
      FROM payments p LEFT JOIN contacts c ON p.partner_id = c.id WHERE 1=1`;
    const params: any[] = [];
    let n = 1;
    if (type && (type === 'Receipt' || type === 'Payment')) { query += ` AND p.payment_type = $${n}`; params.push(type); n++; }
    query += ` ORDER BY p.payment_date DESC, p.created_at DESC`;
    const result = await pool.query(query, params);
    return res.status(200).json({ payments: result.rows });
  } catch {
    return res.status(200).json({ payments: getPayments(), source: 'mock' });
  }
}

async function handleCreate(req: AuthenticatedRequest, res: NextApiResponse) {
  const { payment_type, payment_method, partner_id, payment_date, amount, reference_number, notes } = req.body;
  const parsedAmount = parseFloat(amount);
  if (!payment_type || !parsedAmount || parsedAmount <= 0) {
    return res.status(400).json({ message: 'payment_type and positive amount are required' });
  }
  const dbOk = await isDbAvailable();
  if (!dbOk) {
    const payments = getPayments();
    const prefix = payment_type === 'Receipt' ? 'REC' : 'PAY';
    const seq = payments.length + 1;
    const newPayment = {
      id: randomUUID(),
      payment_number: `${prefix}-${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`,
      payment_type, payment_method: payment_method || 'Bank Transfer',
      partner_id: partner_id || '', partner_name: '',
      payment_date: payment_date || new Date().toISOString().split('T')[0],
      amount: parsedAmount, reference_number: reference_number || '',
      notes: notes || '', status: 'Completed', created_at: new Date().toISOString(),
    };
    payments.push(newPayment);
    savePayments(payments);
    return res.status(201).json({ message: 'Payment recorded', payment: newPayment, source: 'mock' });
  }
  try {
    const prefix = payment_type === 'Receipt' ? 'REC' : 'PAY';
    const seq = (await pool.query('SELECT COUNT(*) FROM payments')).rows[0].count;
    const payment_number = `${prefix}-${new Date().getFullYear()}-${String(parseInt(seq) + 1).padStart(4, '0')}`;
    const createdBy = await resolveCreatedBy(req.user?.id);
    const payRes = await pool.query(
      `INSERT INTO payments (payment_number, payment_type, payment_method, partner_id, payment_date, amount, reference_type, reference_number, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,'Manual',$7,$8,$9) RETURNING *`,
      [payment_number, payment_type, payment_method || 'Bank', partner_id || null, payment_date || new Date().toISOString().split('T')[0], parsedAmount, reference_number || null, notes || null, createdBy]
    );
    return res.status(201).json({ message: 'Payment recorded successfully', payment: payRes.rows[0] });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to record payment', error: error.message });
  }
}

export default authenticateToken(handler);
