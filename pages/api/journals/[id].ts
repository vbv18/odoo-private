import { NextApiResponse } from 'next';
import { pool } from '@/lib/db';
import { AuthenticatedRequest, requirePermission } from '@/lib/auth-middleware';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id || typeof id !== 'string') return res.status(400).json({ message: 'Invalid journal ID' });

  if (req.method === 'GET') return handleGet(req, res, id);
  if (req.method === 'PUT') return handleUpdate(req, res, id);
  if (req.method === 'DELETE') return handleArchive(req, res, id);
  return res.status(405).json({ message: 'Method not allowed' });
}

async function handleGet(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  try {
    const result = await pool.query(
      `SELECT 
        j.*,
        da.account_name as debit_account_name, da.account_code as debit_account_code,
        ca.account_name as credit_account_name, ca.account_code as credit_account_code
       FROM journals j
       LEFT JOIN chart_of_accounts da ON j.default_debit_account_id = da.id
       LEFT JOIN chart_of_accounts ca ON j.default_credit_account_id = ca.id
       WHERE j.id = $1`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Journal not found' });
    return res.status(200).json({ journal: result.rows[0] });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to fetch journal', error: error.message });
  }
}

async function handleUpdate(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  try {
    const { journal_name, journal_type, default_debit_account_id, default_credit_account_id, description } = req.body;
    const validTypes = ['Sales', 'Purchase', 'Bank', 'Cash', 'General'];
    if (journal_type && !validTypes.includes(journal_type)) {
      return res.status(400).json({ message: 'Invalid journal type' });
    }

    const result = await pool.query(
      `UPDATE journals 
       SET journal_name = COALESCE($1, journal_name),
           journal_type = COALESCE($2, journal_type),
           default_debit_account_id = $3,
           default_credit_account_id = $4,
           description = $5,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 RETURNING *`,
      [
        journal_name,
        journal_type,
        default_debit_account_id || null,
        default_credit_account_id || null,
        description || null,
        id
      ]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Journal not found' });
    return res.status(200).json({ message: 'Journal updated successfully', journal: result.rows[0] });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to update journal', error: error.message });
  }
}

async function handleArchive(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  try {
    const result = await pool.query(
      `UPDATE journals SET is_archived = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Journal not found' });
    return res.status(200).json({ message: 'Journal archived successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to archive journal', error: error.message });
  }
}

export default requirePermission('canManageMasterData', handler);
