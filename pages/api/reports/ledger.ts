import { NextApiResponse } from 'next';
import { AuthenticatedRequest, requirePermission } from '@/lib/auth-middleware';
import { isDbAvailable } from '@/lib/db-safe';
import { getChartOfAccounts, getJournalEntries } from '@/lib/mock-data';
import { pool } from '@/lib/db';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  const { from, to, account_id } = req.query;
  const dbOk = await isDbAvailable();

  if (!dbOk) {
    // Build ledger from mock journal entries
    const coa = getChartOfAccounts();
    const entries = getJournalEntries().filter((e: any) => e.status === 'Posted');
    const accounts = account_id ? coa.filter((a: any) => a.id === account_id) : coa;

    // Create synthetic ledger rows from journal entries
    const rows = entries.flatMap((e: any, idx: number) =>
      accounts.slice(0, 3).map((a: any) => ({
        id: `${e.id}-${a.id}`,
        debit_amount: idx % 2 === 0 ? e.total_debit : 0,
        credit_amount: idx % 2 !== 0 ? e.total_credit : 0,
        line_description: e.narration,
        entry_number: e.entry_number,
        entry_date: e.entry_date,
        entry_description: e.narration,
        account_id: a.id,
        account_code: a.account_code,
        account_name: a.account_name,
        account_type: a.account_type,
        partner_name: null,
      }))
    );

    return res.status(200).json({ entries: rows, totalCount: rows.length, source: 'mock' });
  }

  try {
    let filter = `WHERE je.status = 'Posted'`;
    const params: any[] = [];

    if (account_id) { params.push(account_id); filter += ` AND jei.account_id = $${params.length}`; }
    if (from) { params.push(from); filter += ` AND je.entry_date >= $${params.length}`; }
    if (to) { params.push(to); filter += ` AND je.entry_date <= $${params.length}`; }

    const result = await pool.query(
      `SELECT jei.id, jei.debit as debit_amount, jei.credit as credit_amount, jei.description as line_description,
        je.entry_number, je.entry_date, je.narration as entry_description,
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
    return res.status(200).json({ entries: result.rows, totalCount: result.rows.length });
  } catch {
    return res.status(200).json({ entries: [], totalCount: 0, source: 'mock', message: 'Database unavailable' });
  }
}

export default requirePermission('canViewAllReports', handler);
