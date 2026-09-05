import { NextApiResponse } from 'next';
import { pool } from '@/lib/db';
import { AuthenticatedRequest, requirePermission } from '@/lib/auth-middleware';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  const { id } = req.query;
  if (!id || typeof id !== 'string') return res.status(400).json({ message: 'Invalid journal entry ID' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const jeRes = await client.query('SELECT * FROM journal_entries WHERE id = $1', [id]);
    if (jeRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Journal entry not found' });
    }
    const entry = jeRes.rows[0];
    if (entry.status === 'Posted') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Journal entry is already posted' });
    }

    const linesRes = await client.query(
      `SELECT jei.*, coa.account_type 
       FROM journal_entry_items jei 
       JOIN chart_of_accounts coa ON jei.account_id = coa.id 
       WHERE jei.journal_entry_id = $1`,
      [id]
    );
    const lines = linesRes.rows;

    let totalDebit = 0;
    let totalCredit = 0;

    for (const l of lines) {
      totalDebit += parseFloat(l.debit_amount) || 0;
      totalCredit += parseFloat(l.credit_amount) || 0;
    }

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        message: `Debit total (₹${totalDebit.toFixed(2)}) must equal Credit total (₹${totalCredit.toFixed(2)}) to post!`,
      });
    }

    // Update account balances
    for (const l of lines) {
      const debit = parseFloat(l.debit_amount) || 0;
      const credit = parseFloat(l.credit_amount) || 0;
      const isAssetOrExpense = l.account_type === 'Asset' || l.account_type === 'Expense';

      // Asset/Expense: debit increases, credit decreases
      // Liability/Income/Capital: credit increases, debit decreases
      const delta = isAssetOrExpense ? (debit - credit) : (credit - debit);

      await client.query(
        'UPDATE chart_of_accounts SET current_balance = current_balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [delta, l.account_id]
      );
    }

    await client.query(
      `UPDATE journal_entries SET status = 'Posted', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );

    await client.query('COMMIT');
    return res.status(200).json({ message: 'Journal entry posted successfully. Ledger accounts updated.' });
  } catch (error: any) {
    await client.query('ROLLBACK');
    return res.status(500).json({ message: 'Failed to post journal entry', error: error.message });
  } finally {
    client.release();
  }
}

export default requirePermission('canCreateTransactions', handler);
