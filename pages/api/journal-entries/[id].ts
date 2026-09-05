import { NextApiResponse } from 'next';
import { pool } from '@/lib/db';
import { AuthenticatedRequest, requirePermission } from '@/lib/auth-middleware';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id || typeof id !== 'string') return res.status(400).json({ message: 'Invalid journal entry ID' });

  if (req.method === 'GET') return handleGet(req, res, id);
  if (req.method === 'DELETE') return handleDelete(req, res, id);
  return res.status(405).json({ message: 'Method not allowed' });
}

async function handleGet(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  try {
    const entryRes = await pool.query(
      `SELECT 
        je.*,
        j.journal_name, j.journal_type
       FROM journal_entries je
       LEFT JOIN journals j ON je.journal_id = j.id
       WHERE je.id = $1`,
      [id]
    );
    if (entryRes.rows.length === 0) return res.status(404).json({ message: 'Journal entry not found' });

    const linesRes = await pool.query(
      `SELECT 
        jei.*,
        coa.account_code, coa.account_name, coa.account_type,
        c.name as partner_name
       FROM journal_entry_items jei
       LEFT JOIN chart_of_accounts coa ON jei.account_id = coa.id
       LEFT JOIN contacts c ON jei.partner_id = c.id
       WHERE jei.journal_entry_id = $1
       ORDER BY jei.id ASC`,
      [id]
    );

    return res.status(200).json({
      entry: {
        ...entryRes.rows[0],
        lines: linesRes.rows,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to fetch journal entry', error: error.message });
  }
}

async function handleDelete(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  try {
    const check = await pool.query('SELECT status FROM journal_entries WHERE id = $1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ message: 'Journal entry not found' });
    if (check.rows[0].status === 'Posted') {
      return res.status(400).json({ message: 'Posted journal entries cannot be deleted. You must reverse them.' });
    }

    await pool.query('DELETE FROM journal_entries WHERE id = $1', [id]);
    return res.status(200).json({ message: 'Draft journal entry deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to delete journal entry', error: error.message });
  }
}

export default requirePermission('canCreateTransactions', handler);
