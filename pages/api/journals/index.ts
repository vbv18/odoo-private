import { NextApiResponse } from 'next';
import { AuthenticatedRequest, authenticateToken } from '@/lib/auth-middleware';
import { isDbAvailable } from '@/lib/db-safe';
import { getJournals, saveJournals } from '@/lib/mock-data';
import { pool } from '@/lib/db';
import { randomUUID } from 'crypto';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method === 'GET') return handleGet(req, res);
  if (req.method === 'POST') return handleCreate(req, res);
  return res.status(405).json({ message: 'Method not allowed' });
}

async function handleGet(_req: AuthenticatedRequest, res: NextApiResponse) {
  const dbOk = await isDbAvailable();
  if (!dbOk) return res.status(200).json({ journals: getJournals(), source: 'mock' });
  try {
    const result = await pool.query(`
      SELECT 
        j.*,
        da.account_name as debit_account_name, da.account_code as debit_account_code,
        ca.account_name as credit_account_name, ca.account_code as credit_account_code
      FROM journals j
      LEFT JOIN chart_of_accounts da ON j.default_debit_account_id = da.id
      LEFT JOIN chart_of_accounts ca ON j.default_credit_account_id = ca.id
      WHERE j.is_archived = false
      ORDER BY j.journal_name ASC
    `);
    return res.status(200).json({ journals: result.rows });
  } catch {
    return res.status(200).json({ journals: getJournals(), source: 'mock' });
  }
}

async function handleCreate(req: AuthenticatedRequest, res: NextApiResponse) {
  const { journal_name, journal_type, default_debit_account_id, default_credit_account_id, description, code } = req.body;
  if (!journal_name || !journal_type) return res.status(400).json({ message: 'journal_name and journal_type are required' });

  const dbOk = await isDbAvailable();
  if (!dbOk) {
    const journals = getJournals();
    const newJ = {
      id: randomUUID(),
      journal_name,
      journal_type,
      code: code || journal_name.slice(0, 3).toUpperCase(),
      description: description || null,
      default_debit_account_id: default_debit_account_id || null,
      default_credit_account_id: default_credit_account_id || null,
      debit_account_name: null,
      debit_account_code: null,
      credit_account_name: null,
      credit_account_code: null,
      is_archived: false,
      is_active: true,
      created_at: new Date().toISOString()
    };
    journals.push(newJ);
    saveJournals(journals);
    return res.status(201).json({ message: 'Journal created', journal: newJ, source: 'mock' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO journals (journal_name, journal_type, default_debit_account_id, default_credit_account_id, description, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
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

export default authenticateToken(handler);

