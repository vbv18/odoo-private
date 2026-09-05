import { NextApiResponse } from 'next';
import { pool } from '@/lib/db';
import { AuthenticatedRequest, requirePermission } from '@/lib/auth-middleware';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method === 'GET') return handleGet(req, res);
  if (req.method === 'POST') return handleCreate(req, res);
  return res.status(405).json({ message: 'Method not allowed' });
}

async function handleGet(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const result = await pool.query(`
      SELECT 
        b.*,
        aa.account_name as analytic_account_name, aa.account_type as analytic_account_type,
        u.name as responsible_person_name
      FROM budgets b
      LEFT JOIN analytic_accounts aa ON b.analytic_account_id = aa.id
      LEFT JOIN users u ON b.responsible_person = u.id
      WHERE b.is_archived = false
      ORDER BY b.period_start DESC
    `);
    return res.status(200).json({ budgets: result.rows });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to fetch budgets', error: error.message });
  }
}

async function handleCreate(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const { budget_name, analytic_account_id, period_start, period_end, planned_amount, responsible_person } = req.body;
    if (!budget_name || !period_start || !period_end || !planned_amount) {
      return res.status(400).json({ message: 'budget_name, period_start, period_end, and planned_amount are required' });
    }

    const planned = parseFloat(planned_amount) || 0;

    const result = await pool.query(
      `INSERT INTO budgets 
        (budget_name, analytic_account_id, period_start, period_end, planned_amount, achieved_amount, status, responsible_person, created_by)
       VALUES ($1, $2, $3, $4, $5, 0, 'Active', $6, $7)
       RETURNING *`,
      [
        budget_name,
        analytic_account_id || null,
        period_start,
        period_end,
        planned,
        responsible_person || null,
        req.user?.id || null,
      ]
    );

    return res.status(201).json({ message: 'Budget created successfully', budget: result.rows[0] });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to create budget', error: error.message });
  }
}

export default requirePermission('canManageMasterData', handler);
