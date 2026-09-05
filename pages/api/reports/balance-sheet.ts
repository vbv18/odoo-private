import { NextApiResponse } from 'next';
import { pool } from '@/lib/db';
import { AuthenticatedRequest, requirePermission } from '@/lib/auth-middleware';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  try {
    const { as_of } = req.query;

    // Get current balances from Chart of Accounts
    const result = await pool.query(`
      SELECT 
        id, account_code, account_name, account_type, current_balance, parent_account_id
      FROM chart_of_accounts
      WHERE is_archived = false AND account_type IN ('Asset', 'Liability', 'Capital')
      ORDER BY account_code ASC
    `);

    const assets = result.rows.filter((r) => r.account_type === 'Asset');
    const liabilities = result.rows.filter((r) => r.account_type === 'Liability');
    const equity = result.rows.filter((r) => r.account_type === 'Capital');

    // Also calculate retained earnings (Net Income from Income - Expense)
    const plRes = await pool.query(`
      SELECT 
        account_type,
        SUM(current_balance) as total
      FROM chart_of_accounts
      WHERE is_archived = false AND account_type IN ('Income', 'Expense')
      GROUP BY account_type
    `);

    let totalIncome = 0;
    let totalExpense = 0;
    for (const row of plRes.rows) {
      if (row.account_type === 'Income') totalIncome = parseFloat(row.total) || 0;
      if (row.account_type === 'Expense') totalExpense = parseFloat(row.total) || 0;
    }
    const currentYearEarnings = totalIncome - totalExpense;

    const totalAssets = assets.reduce((sum, a) => sum + (parseFloat(a.current_balance) || 0), 0);
    const totalLiabilities = liabilities.reduce((sum, l) => sum + (parseFloat(l.current_balance) || 0), 0);
    const totalCapital = equity.reduce((sum, e) => sum + (parseFloat(e.current_balance) || 0), 0);
    const totalEquity = totalCapital + currentYearEarnings;

    return res.status(200).json({
      as_of: as_of || new Date().toISOString().split('T')[0],
      assets,
      liabilities,
      equity,
      currentYearEarnings,
      totalAssets,
      totalLiabilities,
      totalEquity,
      totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
      isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1.0,
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to generate balance sheet', error: error.message });
  }
}

export default requirePermission('canViewAllReports', handler);
