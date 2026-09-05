import { NextApiResponse } from 'next';
import { pool } from '@/lib/db';
import { AuthenticatedRequest, requirePermission } from '@/lib/auth-middleware';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id || typeof id !== 'string') return res.status(400).json({ message: 'Invalid account ID' });

  if (req.method === 'GET') return handleGet(req, res, id);
  if (req.method === 'PUT') return handleUpdate(req, res, id);
  if (req.method === 'DELETE') return handleArchive(req, res, id);
  return res.status(405).json({ message: 'Method not allowed' });
}

async function handleGet(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  try {
    const result = await pool.query(
      `SELECT coa.*, parent.account_name as parent_account_name
       FROM chart_of_accounts coa
       LEFT JOIN chart_of_accounts parent ON coa.parent_account_id = parent.id
       WHERE coa.id = $1`, [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Account not found' });
    return res.status(200).json({ account: result.rows[0] });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to fetch account', error: error.message });
  }
}

async function handleUpdate(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  try {
    const { account_name, account_type, parent_account_id, opening_balance } = req.body;
    // Check system account
    const check = await pool.query('SELECT is_system_account FROM chart_of_accounts WHERE id = $1', [id]);
    if (check.rows[0]?.is_system_account && req.user?.role !== 'Admin') {
      return res.status(403).json({ message: 'Only Admin can modify system accounts' });
    }
    const result = await pool.query(
      `UPDATE chart_of_accounts 
       SET account_name=$1, account_type=$2, parent_account_id=$3, opening_balance=$4, updated_at=CURRENT_TIMESTAMP
       WHERE id=$5 RETURNING *`,
      [account_name, account_type, parent_account_id || null, opening_balance || 0, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Account not found' });
    return res.status(200).json({ message: 'Account updated successfully', account: result.rows[0] });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to update account', error: error.message });
  }
}

async function handleArchive(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  try {
    if (req.user?.role !== 'Admin') return res.status(403).json({ message: 'Only Admin can archive accounts' });
    const check = await pool.query('SELECT is_system_account FROM chart_of_accounts WHERE id = $1', [id]);
    if (check.rows[0]?.is_system_account) return res.status(400).json({ message: 'System accounts cannot be archived' });

    const result = await pool.query(
      `UPDATE chart_of_accounts SET is_archived=true, updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *`, [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Account not found' });
    return res.status(200).json({ message: 'Account archived successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to archive account', error: error.message });
  }
}

export default requirePermission('canManageMasterData', handler);
