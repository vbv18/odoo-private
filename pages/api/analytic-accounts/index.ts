import { NextApiResponse } from 'next';
import { pool } from '@/lib/db';
import { AuthenticatedRequest, requirePermission } from '@/lib/auth-middleware';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method === 'GET') return handleGet(req, res);
  if (req.method === 'POST') return handleCreate(req, res);
  return res.status(405).json({ message: 'Method not allowed' });
}

async function handleGet(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const result = await pool.query(`
      SELECT * FROM analytic_accounts
      WHERE is_archived = false
      ORDER BY account_name ASC
    `);
    return res.status(200).json({ accounts: result.rows });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to fetch analytic accounts', error: error.message });
  }
}

async function handleCreate(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const { account_name, account_type, description } = req.body;
    if (!account_name || !account_type) {
      return res.status(400).json({ message: 'account_name and account_type are required' });
    }
    if (!['Income', 'Expenses'].includes(account_type)) {
      return res.status(400).json({ message: 'Invalid account type (Income or Expenses)' });
    }

    const result = await pool.query(
      `INSERT INTO analytic_accounts (account_name, account_type, description, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [account_name, account_type, description || null, req.user?.id || null]
    );

    return res.status(201).json({ message: 'Analytic account created successfully', account: result.rows[0] });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to create analytic account', error: error.message });
  }
}

export default requirePermission('canManageMasterData', handler);
