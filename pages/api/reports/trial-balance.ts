import { NextApiResponse } from 'next';
import { pool } from '@/lib/db';
import { AuthenticatedRequest, requirePermission } from '@/lib/auth-middleware';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  try {
    const result = await pool.query(`
      SELECT 
        coa.id, coa.account_code, coa.account_name, coa.account_type,
        coa.opening_balance, coa.current_balance,
        COALESCE(SUM(jei.debit_amount), 0) as total_debit,
        COALESCE(SUM(jei.credit_amount), 0) as total_credit
      FROM chart_of_accounts coa
      LEFT JOIN journal_entry_items jei ON coa.id = jei.account_id
      LEFT JOIN journal_entries je ON jei.journal_entry_id = je.id AND je.status = 'Posted'
      WHERE coa.is_archived = false
      GROUP BY coa.id, coa.account_code, coa.account_name, coa.account_type, coa.opening_balance, coa.current_balance
      ORDER BY coa.account_code ASC
    `);

    let totalDebit = 0;
    let totalCredit = 0;

    const accounts = result.rows.map((row: any) => {
      const debit = parseFloat(row.total_debit) || 0;
      const credit = parseFloat(row.total_credit) || 0;
      totalDebit += debit;
      totalCredit += credit;
      return {
        ...row,
        debit,
        credit,
      };
    });

    return res.status(200).json({
      accounts,
      totalDebit,
      totalCredit,
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to generate Trial Balance', error: error.message });
  }
}

export default requirePermission('canViewAllReports', handler);
