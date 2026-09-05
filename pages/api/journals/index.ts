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
    const result = await pool.query(`SELECT * FROM journals WHERE is_active = true ORDER BY journal_name ASC`);
    return res.status(200).json({ journals: result.rows });
  } catch {
    return res.status(200).json({ journals: getJournals(), source: 'mock' });
  }
}

async function handleCreate(req: AuthenticatedRequest, res: NextApiResponse) {
  const { journal_name, journal_type, code } = req.body;
  if (!journal_name || !journal_type) return res.status(400).json({ message: 'journal_name and journal_type are required' });

  const dbOk = await isDbAvailable();
  if (!dbOk) {
    const journals = getJournals();
    const newJ = { id: randomUUID(), journal_name, journal_type, code: code || journal_name.slice(0, 3).toUpperCase(), is_active: true, created_at: new Date().toISOString() };
    journals.push(newJ);
    saveJournals(journals);
    return res.status(201).json({ message: 'Journal created', journal: newJ, source: 'mock' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO journals (journal_name, journal_type, code, created_by) VALUES ($1,$2,$3,$4) RETURNING *`,
      [journal_name, journal_type, code || null, req.user?.id || null]
    );
    return res.status(201).json({ message: 'Journal created successfully', journal: result.rows[0] });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to create journal', error: error.message });
  }
}

export default authenticateToken(handler);
