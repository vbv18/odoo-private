import { NextApiResponse } from 'next';
import { AuthenticatedRequest, authenticateToken } from '@/lib/auth-middleware';
import { isDbAvailable } from '@/lib/db-safe';
import { getBudgets, saveBudgets } from '@/lib/mock-data';
import { pool } from '@/lib/db';
import { randomUUID } from 'crypto';
import { resolveCreatedBy } from '@/lib/db-users';

const isValidUuid = (val: unknown) =>
  typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method === 'GET') return handleGet(req, res);
  if (req.method === 'POST') return handleCreate(req, res);
  return res.status(405).json({ message: 'Method not allowed' });
}

async function handleGet(_req: AuthenticatedRequest, res: NextApiResponse) {
  const dbOk = await isDbAvailable();
  if (!dbOk) return res.status(200).json({ budgets: getBudgets(), source: 'mock' });
  try {
    const result = await pool.query(`
      SELECT b.*,
             aa.account_name as analytic_account_name,
             u.full_name as responsible_person_name
      FROM budgets b
      LEFT JOIN analytic_accounts aa ON b.analytic_account_id = aa.id
      LEFT JOIN users u ON b.responsible_person = u.id
      WHERE b.is_archived = false
      ORDER BY b.created_at DESC
    `);
    return res.status(200).json({ budgets: result.rows });
  } catch {
    return res.status(200).json({ budgets: getBudgets(), source: 'mock' });
  }
}

async function handleCreate(req: AuthenticatedRequest, res: NextApiResponse) {
  const { budget_name, analytic_account_id, period_start, period_end, planned_amount, status, responsible_person, fiscal_year, total_amount, start_date, end_date } = req.body;
  
  const finalBudgetTitle = budget_name || fiscal_year;
  const rawAmount = planned_amount !== undefined && planned_amount !== null && planned_amount !== '' 
    ? planned_amount 
    : total_amount;
  const finalAmount = rawAmount !== undefined && rawAmount !== null ? parseFloat(String(rawAmount)) : NaN;
  const finalStart = period_start || start_date || '2026-04-01';
  const finalEnd = period_end || end_date || '2027-03-31';

  if (!finalBudgetTitle || isNaN(finalAmount)) {
    return res.status(400).json({ message: 'budget_name and planned_amount are required' });
  }

  const dbOk = await isDbAvailable();
  if (!dbOk) {
    const budgets = getBudgets();
    const newB = {
      id: randomUUID(),
      budget_name: finalBudgetTitle,
      fiscal_year: fiscal_year || finalBudgetTitle,
      total_amount: finalAmount,
      planned_amount: finalAmount,
      spent_amount: 0,
      achieved_amount: 0,
      status: status || 'Active',
      start_date: finalStart,
      period_start: finalStart,
      end_date: finalEnd,
      period_end: finalEnd,
      analytic_account_id: analytic_account_id || null,
      analytic_account_name: null,
      responsible_person: responsible_person || null,
      responsible_person_name: null,
      created_at: new Date().toISOString(),
    };
    budgets.push(newB);
    saveBudgets(budgets);
    return res.status(201).json({ message: 'Budget created', budget: newB, source: 'mock' });
  }

  try {
    const createdBy = await resolveCreatedBy(req.user?.id);
    const safeAnalyticId = isValidUuid(analytic_account_id) ? analytic_account_id : null;
    const safeResponsible = isValidUuid(responsible_person) ? responsible_person : null;
    const result = await pool.query(
      `INSERT INTO budgets (budget_name, analytic_account_id, period_start, period_end, planned_amount, status, responsible_person, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        finalBudgetTitle,
        safeAnalyticId,
        finalStart,
        finalEnd,
        finalAmount,
        status || 'Active',
        safeResponsible,
        createdBy,
      ]
    );
    return res.status(201).json({ message: 'Budget created successfully', budget: result.rows[0] });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to create budget', error: error.message });
  }
}

export default authenticateToken(handler);

