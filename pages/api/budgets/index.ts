import { NextApiResponse } from 'next';
import { AuthenticatedRequest, authenticateToken } from '@/lib/auth-middleware';
import { isDbAvailable } from '@/lib/db-safe';
import { getBudgets, saveBudgets } from '@/lib/mock-data';
import { pool } from '@/lib/db';
import { randomUUID } from 'crypto';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method === 'GET') return handleGet(req, res);
  if (req.method === 'POST') return handleCreate(req, res);
  return res.status(405).json({ message: 'Method not allowed' });
}

async function handleGet(_req: AuthenticatedRequest, res: NextApiResponse) {
  const dbOk = await isDbAvailable();
  if (!dbOk) return res.status(200).json({ budgets: getBudgets(), source: 'mock' });
  try {
    const result = await pool.query(`SELECT * FROM budgets ORDER BY created_at DESC`);
    return res.status(200).json({ budgets: result.rows });
  } catch {
    return res.status(200).json({ budgets: getBudgets(), source: 'mock' });
  }
}

async function handleCreate(req: AuthenticatedRequest, res: NextApiResponse) {
  const { budget_name, fiscal_year, total_amount, start_date, end_date } = req.body;
  if (!budget_name || !fiscal_year || !total_amount) {
    return res.status(400).json({ message: 'budget_name, fiscal_year, and total_amount are required' });
  }
  const dbOk = await isDbAvailable();
  if (!dbOk) {
    const budgets = getBudgets();
    const newB = { id: randomUUID(), budget_name, fiscal_year, total_amount: parseFloat(total_amount), spent_amount: 0, status: 'Active', start_date: start_date || null, end_date: end_date || null, created_at: new Date().toISOString() };
    budgets.push(newB);
    saveBudgets(budgets);
    return res.status(201).json({ message: 'Budget created', budget: newB, source: 'mock' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO budgets (budget_name, fiscal_year, total_amount, spent_amount, status, start_date, end_date, created_by)
       VALUES ($1,$2,$3,0,'Active',$4,$5,$6) RETURNING *`,
      [budget_name, fiscal_year, total_amount, start_date || null, end_date || null, req.user?.id || null]
    );
    return res.status(201).json({ message: 'Budget created successfully', budget: result.rows[0] });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to create budget', error: error.message });
  }
}

export default authenticateToken(handler);
