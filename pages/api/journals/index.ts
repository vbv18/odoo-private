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
      SELECT 
        j.id, j.journal_name, j.journal_type, j.description, j.is_archived,
        j.default_debit_account_id, j.default_credit_account_id,
        da.account_name as debit_account_name, da.account_code as debit_account_code,
        ca.account_name as credit_account_name, ca.account_code as credit_account_code
      FROM journals j
      LEFT JOIN chart_of_accounts da ON j.default_debit_account_id = da.id
      LEFT JOIN chart_of_accounts ca ON j.default_credit_account_id = ca.id
      WHERE j.is_archived = false
      ORDER BY j.journal_type ASC, j.journal_name ASC
    `);
    return res.status(200).json({ journals: result.rows });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to fetch journals', error: error.message });
  }
}

async function handleCreate(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const { journal_name, journal_type, default_debit_account_id, default_credit_account_id, description } = req.body;
    if (!journal_name || !journal_type) {
      return res.status(400).json({ message: 'journal_name and journal_type are required' });
    }
    const validTypes = ['Sales', 'Purchase', 'Bank', 'Cash', 'General'];
    if (!validTypes.includes(journal_type)) {
      return res.status(400).json({ message: 'Invalid journal type. Must be Sales, Purchase, Bank, Cash, or General' });
    }

    const result = await pool.query(
      `INSERT INTO journals 
        (journal_name, journal_type, default_debit_account_id, default_credit_account_id, description, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        journal_name,
        journal_type,
        default_debit_account_id || null,
        default_credit_account_id || null,
        description || null,
        req.user?.id || null
      ]
    );
    return res.status(201).json({ message: 'Journal created successfully', journal: result.rows[0] });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to create journal', error: error.message });
  }
}

export default requirePermission('canManageMasterData', handler);
