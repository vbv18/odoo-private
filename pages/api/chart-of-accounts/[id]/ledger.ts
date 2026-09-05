import { NextApiResponse } from 'next';
import { pool } from '@/lib/db';
import { AuthenticatedRequest, requirePermission } from '@/lib/auth-middleware';

// GET /api/chart-of-accounts/[id]/ledger?from=&to=
async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });
  const { id } = req.query;
  if (!id || typeof id !== 'string') return res.status(400).json({ message: 'Invalid account ID' });

  try {
    const { from, to } = req.query;
    let dateFilter = '';
    const params: any[] = [id];

    if (from) { dateFilter += ` AND je.entry_date >= $${params.length + 1}`; params.push(from); }
    if (to)   { dateFilter += ` AND je.entry_date <= $${params.length + 1}`; params.push(to); }

    const result = await pool.query(`
      SELECT 
        jel.id, jel.debit_amount, jel.credit_amount, jel.description,
        je.entry_number, je.entry_date, je.description as entry_description, je.status,
        coa.account_name, coa.account_code
      FROM journal_entry_items jel
      JOIN journal_entries je ON jel.journal_entry_id = je.id
      JOIN chart_of_accounts coa ON jel.account_id = coa.id
      WHERE jel.account_id = $1 ${dateFilter}
      ORDER BY je.entry_date DESC, jel.id ASC
    `, params);

    // Compute running balance
    let runningBalance = 0;
    const lines = result.rows.map((row: any) => {
      runningBalance += (parseFloat(row.debit_amount) || 0) - (parseFloat(row.credit_amount) || 0);
      return { ...row, running_balance: runningBalance };
    });

    return res.status(200).json({ ledger: lines, total: lines.length });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to fetch ledger', error: error.message });
  }
}

export default requirePermission('canViewAllReports', handler);
