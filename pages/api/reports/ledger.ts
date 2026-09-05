import { NextApiResponse } from 'next';
import { pool } from '@/lib/db';
import { AuthenticatedRequest, requirePermission } from '@/lib/auth-middleware';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  try {
    const { from, to, account_id } = req.query;
    let filter = `WHERE je.status = 'Posted'`;
    const params: any[] = [];

    if (account_id) {
      params.push(account_id);
      filter += ` AND jei.account_id = $${params.length}`;
    }
    if (from) {
      params.push(from);
      filter += ` AND je.entry_date >= $${params.length}`;
    }
    if (to) {
      params.push(to);
      filter += ` AND je.entry_date <= $${params.length}`;
    }

    const result = await pool.query(
      `SELECT 
        jei.id, jei.debit_amount, jei.credit_amount, jei.description as line_description,
        je.entry_number, je.entry_date, je.description as entry_description,
        coa.id as account_id, coa.account_code, coa.account_name, coa.account_type,
        c.name as partner_name
       FROM journal_entry_items jei
       JOIN journal_entries je ON jei.journal_entry_id = je.id
       JOIN chart_of_accounts coa ON jei.account_id = coa.id
       LEFT JOIN contacts c ON jei.partner_id = c.id
       ${filter}
       ORDER BY coa.account_code ASC, je.entry_date ASC, jei.id ASC`,
      params
    );

    return res.status(200).json({
      entries: result.rows,
      totalCount: result.rows.length,
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to fetch general ledger', error: error.message });
  }
}

export default requirePermission('canViewAllReports', handler);
