import { NextApiResponse } from 'next';
import { AuthenticatedRequest, authenticateToken } from '@/lib/auth-middleware';
import { isDbAvailable } from '@/lib/db-safe';
import { getJournalEntries, saveJournalEntries } from '@/lib/mock-data';
import { pool } from '@/lib/db';
import { randomUUID } from 'crypto';
import { resolveCreatedBy } from '@/lib/db-users';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method === 'GET') return handleGet(req, res);
  if (req.method === 'POST') return handleCreate(req, res);
  return res.status(405).json({ message: 'Method not allowed' });
}

async function handleGet(req: AuthenticatedRequest, res: NextApiResponse) {
  const dbOk = await isDbAvailable();
  if (!dbOk) {
    let entries = getJournalEntries();
    const { status, search } = req.query;
    if (status) entries = entries.filter((e: any) => e.status === status);
    if (search) entries = entries.filter((e: any) =>
      e.entry_number.toLowerCase().includes((search as string).toLowerCase()) ||
      (e.narration || '').toLowerCase().includes((search as string).toLowerCase())
    );
    return res.status(200).json({ entries, total: entries.length, source: 'mock' });
  }
  try {
    const result = await pool.query(`
      SELECT je.*, j.journal_name
      FROM journal_entries je
      LEFT JOIN journals j ON je.journal_id = j.id
      ORDER BY je.entry_date DESC, je.created_at DESC
    `);
    return res.status(200).json({ entries: result.rows, total: result.rows.length });
  } catch {
    return res.status(200).json({ entries: getJournalEntries(), source: 'mock' });
  }
}

async function handleCreate(req: AuthenticatedRequest, res: NextApiResponse) {
  const { journal_id, entry_date, lines } = req.body;
  const reference_number = req.body.reference_number || req.body.reference || null;
  const description = req.body.description || req.body.narration || null;
  const status = req.body.status || 'Draft';

  if (!journal_id || !entry_date || !lines || !Array.isArray(lines) || lines.length < 2) {
    return res.status(400).json({ message: 'journal_id, entry_date, and at least 2 lines are required' });
  }
  const totalDebit = lines.reduce((s: number, l: any) => s + (parseFloat(l.debit_amount ?? l.debit) || 0), 0);
  const totalCredit = lines.reduce((s: number, l: any) => s + (parseFloat(l.credit_amount ?? l.credit) || 0), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return res.status(400).json({ message: 'Total debits must equal total credits' });
  }

  const isValidUuid = (val: any) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

  const dbOk = await isDbAvailable();
  if (!dbOk) {
    const entries = getJournalEntries();
    const seq = entries.length + 1;
    const newEntry = {
      id: randomUUID(),
      entry_number: `JE-${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`,
      journal_id,
      journal_name: 'General Journal',
      entry_date,
      reference_number,
      reference: reference_number,
      description,
      narration: description,
      status,
      total_debit: totalDebit,
      total_credit: totalCredit,
      created_at: new Date().toISOString(),
      lines: lines.map((l: any) => ({
        id: randomUUID(),
        account_id: l.account_id,
        partner_id: l.partner_id || null,
        description: l.description || '',
        debit_amount: parseFloat(l.debit_amount ?? l.debit) || 0,
        credit_amount: parseFloat(l.credit_amount ?? l.credit) || 0,
      })),
    };
    entries.push(newEntry);
    saveJournalEntries(entries);
    return res.status(201).json({ message: 'Journal entry created', entry: newEntry, source: 'mock' });
  }
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const seq = (await client.query('SELECT COUNT(*) FROM journal_entries')).rows[0].count;
      const entry_number = `JE-${new Date().getFullYear()}-${String(parseInt(seq) + 1).padStart(4, '0')}`;
      const safeJournalId = isValidUuid(journal_id) ? journal_id : null;
      const createdBy = await resolveCreatedBy(req.user?.id, client);
      const entryRes = await client.query(
        `INSERT INTO journal_entries (entry_number, journal_id, entry_date, reference_number, description, status, total_debit, total_credit, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [entry_number, safeJournalId, entry_date, reference_number, description, status, totalDebit, totalCredit, createdBy]
      );
      for (const line of lines) {
        const safeAccountId = isValidUuid(line.account_id) ? line.account_id : null;
        const safePartnerId = isValidUuid(line.partner_id) ? line.partner_id : null;
        await client.query(
          `INSERT INTO journal_entry_items (journal_entry_id, account_id, partner_id, description, debit_amount, credit_amount)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [entryRes.rows[0].id, safeAccountId, safePartnerId, line.description || null, parseFloat(line.debit_amount ?? line.debit) || 0, parseFloat(line.credit_amount ?? line.credit) || 0]
        );
      }
      await client.query('COMMIT');
      return res.status(201).json({ message: 'Journal entry created successfully', entry: entryRes.rows[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to create journal entry', error: error.message });
  }
}

export default authenticateToken(handler);
