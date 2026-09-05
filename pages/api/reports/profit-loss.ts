import { NextApiResponse } from 'next';
import { pool } from '@/lib/db';
import { AuthenticatedRequest, requirePermission } from '@/lib/auth-middleware';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  try {
    const { from, to } = req.query;

    const result = await pool.query(`
      SELECT 
        id, account_code, account_name, account_type, current_balance
      FROM chart_of_accounts
      WHERE is_archived = false AND account_type IN ('Income', 'Expense')
      ORDER BY account_code ASC
    `);

    const income = result.rows.filter((r) => r.account_type === 'Income');
    const expenses = result.rows.filter((r) => r.account_type === 'Expense');

    const totalIncome = income.reduce((sum, i) => sum + (parseFloat(i.current_balance) || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + (parseFloat(e.current_balance) || 0), 0);
    const netProfit = totalIncome - totalExpenses;

    return res.status(200).json({
      period: {
        from: from || '2026-01-01',
        to: to || new Date().toISOString().split('T')[0],
      },
      income,
      expenses,
      totalIncome,
      totalExpenses,
      netProfit,
      profitMargin: totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : '0',
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to generate Profit & Loss report', error: error.message });
  }
}

export default requirePermission('canViewAllReports', handler);
