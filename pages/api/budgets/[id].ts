import { NextApiResponse } from 'next';
import { pool } from '@/lib/db';
import { AuthenticatedRequest, requirePermission } from '@/lib/auth-middleware';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id || typeof id !== 'string') return res.status(400).json({ message: 'Invalid budget ID' });

  if (req.method === 'GET') return handleGet(req, res, id);
  if (req.method === 'PUT') return handleUpdate(req, res, id);
  if (req.method === 'DELETE') return handleDelete(req, res, id);
  return res.status(405).json({ message: 'Method not allowed' });
}

async function handleGet(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  try {
    const result = await pool.query(
      `SELECT 
        b.*,
        aa.account_name as analytic_account_name, aa.account_type as analytic_account_type,
        u.full_name as responsible_person_name
       FROM budgets b
       LEFT JOIN analytic_accounts aa ON b.analytic_account_id = aa.id
       LEFT JOIN users u ON b.responsible_person = u.id
       WHERE b.id = $1`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Budget not found' });
    return res.status(200).json({ budget: result.rows[0] });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to fetch budget', error: error.message });
  }
}

async function handleUpdate(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  try {
    const { budget_name, analytic_account_id, period_start, period_end, planned_amount, status, responsible_person } = req.body;
    const isValidUuid = (val: unknown) =>
      typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
    const safeAnalyticId =
      analytic_account_id === undefined
        ? undefined
        : isValidUuid(analytic_account_id)
          ? analytic_account_id
          : null;
    const safeResponsible =
      responsible_person === undefined
        ? undefined
        : isValidUuid(responsible_person)
          ? responsible_person
          : null;
    const result = await pool.query(
      `UPDATE budgets 
       SET budget_name = COALESCE($1, budget_name),
           analytic_account_id = COALESCE($2, analytic_account_id),
           period_start = COALESCE($3, period_start),
           period_end = COALESCE($4, period_end),
           planned_amount = COALESCE($5, planned_amount),
           status = COALESCE($6, status),
           responsible_person = COALESCE($7, responsible_person),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 RETURNING *`,
      [
        budget_name,
        safeAnalyticId ?? null,
        period_start,
        period_end,
        planned_amount ? parseFloat(planned_amount) : null,
        status,
        safeResponsible ?? null,
        id
      ]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Budget not found' });
    return res.status(200).json({ message: 'Budget updated successfully', budget: result.rows[0] });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to update budget', error: error.message });
  }
}

async function handleDelete(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  try {
    const result = await pool.query(
      `UPDATE budgets SET is_archived = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Budget not found' });
    return res.status(200).json({ message: 'Budget archived successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to archive budget', error: error.message });
  }
}

export default requirePermission('canManageMasterData', handler);
