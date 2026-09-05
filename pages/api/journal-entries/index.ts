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
        je.id, je.entry_number, je.entry_date, je.reference_type, je.reference_number,
        je.description, je.status, je.total_debit, je.total_credit, je.created_at,
        j.journal_name, j.journal_type
      FROM journal_entries je
      LEFT JOIN journals j ON je.journal_id = j.id
      ORDER BY je.entry_date DESC, je.created_at DESC
    `);
    return res.status(200).json({ entries: result.rows });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to fetch journal entries', error: error.message });
  }
}

async function handleCreate(req: AuthenticatedRequest, res: NextApiResponse) {
  const client = await pool.connect();
  try {
    const { journal_id, entry_date, description, reference_number, lines } = req.body;
    if (!journal_id || !entry_date || !lines || !Array.isArray(lines) || lines.length < 2) {
      return res.status(400).json({ message: 'journal_id, entry_date, and at least 2 debit/credit lines are required' });
    }

    await client.query('BEGIN');

    let totalDebit = 0;
    let totalCredit = 0;

    for (const line of lines) {
      const debit = parseFloat(line.debit_amount) || 0;
      const credit = parseFloat(line.credit_amount) || 0;
      totalDebit += debit;
      totalCredit += credit;
    }

    const countRes = await client.query('SELECT COUNT(*) FROM journal_entries');
    const seq = parseInt(countRes.rows[0].count, 10) + 1;
    const entry_number = `JE-${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`;

    const jeRes = await client.query(
      `INSERT INTO journal_entries 
        (entry_number, journal_id, entry_date, reference_type, reference_number, description, status, total_debit, total_credit, created_by)
       VALUES ($1, $2, $3, 'Manual', $4, $5, 'Draft', $6, $7, $8)
       RETURNING *`,
      [entry_number, journal_id, entry_date, reference_number || null, description || null, totalDebit, totalCredit, req.user?.id || null]
    );
    const entry = jeRes.rows[0];

    for (const line of lines) {
      const debit = parseFloat(line.debit_amount) || 0;
      const credit = parseFloat(line.credit_amount) || 0;
      if (debit > 0 || credit > 0) {
        await client.query(
          `INSERT INTO journal_entry_items 
            (journal_entry_id, account_id, description, debit_amount, credit_amount, partner_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [entry.id, line.account_id, line.description || '', debit, credit, line.partner_id || null]
        );
      }
    }

    await client.query('COMMIT');
    return res.status(201).json({ message: 'Journal entry created successfully', entry });
  } catch (error: any) {
    await client.query('ROLLBACK');
    return res.status(500).json({ message: 'Failed to create journal entry', error: error.message });
  } finally {
    client.release();
  }
}

export default requirePermission('canCreateTransactions', handler);
