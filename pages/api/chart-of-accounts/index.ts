import { NextApiResponse } from 'next';
import { AuthenticatedRequest, requirePermission } from '@/lib/auth-middleware';
import { isDbAvailable } from '@/lib/db-safe';
import { getChartOfAccounts, saveCOA } from '@/lib/mock-data';
import { pool } from '@/lib/db';
import { randomUUID } from 'crypto';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method === 'GET') return handleGet(req, res);
  if (req.method === 'POST') return handleCreate(req, res);
  return res.status(405).json({ message: 'Method not allowed' });
}

async function handleGet(req: AuthenticatedRequest, res: NextApiResponse) {
  const dbOk = await isDbAvailable();
  if (!dbOk) {
    return res.status(200).json({ accounts: getChartOfAccounts(), source: 'mock' });
  }
  try {
    const result = await pool.query(`
      SELECT coa.id, coa.account_code, coa.account_name, coa.account_type,
        coa.parent_account_id, coa.is_system_account, coa.opening_balance,
        coa.current_balance, coa.is_archived,
        parent.account_name as parent_account_name
      FROM chart_of_accounts coa
      LEFT JOIN chart_of_accounts parent ON coa.parent_account_id = parent.id
      WHERE coa.is_archived = false ORDER BY coa.account_code ASC`);
    return res.status(200).json({ accounts: result.rows });
  } catch {
    return res.status(200).json({ accounts: getChartOfAccounts(), source: 'mock' });
  }
}

async function handleCreate(req: AuthenticatedRequest, res: NextApiResponse) {
  const { account_code, account_name, account_type, parent_account_id, opening_balance } = req.body;
  if (!account_code || !account_name || !account_type) return res.status(400).json({ message: 'account_code, account_name, and account_type are required' });
  if (!['Asset', 'Liability', 'Expense', 'Income', 'Capital'].includes(account_type)) return res.status(400).json({ message: 'Invalid account type' });

  const dbOk = await isDbAvailable();
  if (!dbOk) {
    const accounts = getChartOfAccounts();
    if (accounts.some((a: any) => a.account_code === account_code)) return res.status(400).json({ message: 'Account code already exists' });
    const newAcc = { id: randomUUID(), account_code, account_name, account_type, parent_account_id: parent_account_id || null, parent_account_name: null, is_system_account: false, opening_balance: opening_balance || 0, current_balance: opening_balance || 0, is_archived: false };
    accounts.push(newAcc);
    saveCOA(accounts);
    return res.status(201).json({ message: 'Account created successfully', account: newAcc, source: 'mock' });
  }

  try {
    const existing = await pool.query('SELECT id FROM chart_of_accounts WHERE account_code = $1', [account_code]);
    if (existing.rows.length > 0) return res.status(400).json({ message: 'Account code already exists' });
    const result = await pool.query(
      `INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, opening_balance, current_balance, created_by) VALUES ($1,$2,$3,$4,$5,$5,$6) RETURNING *`,
      [account_code, account_name, account_type, parent_account_id || null, opening_balance || 0, req.user?.id || null]
    );
    return res.status(201).json({ message: 'Account created successfully', account: result.rows[0] });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to create account', error: error.message });
  }
}

export default requirePermission('canManageMasterData', handler);
