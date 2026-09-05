import { NextApiResponse } from 'next';
import { pool } from '@/lib/db';
import { AuthenticatedRequest, requirePermission } from '@/lib/auth-middleware';
import { postCustomerInvoice } from '@/lib/accounting-helpers';
import { getStoredInvoiceById, updateStoredInvoice } from '@/lib/invoices-store';
import { resolveCreatedBy } from '@/lib/db-users';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  const { id } = req.query;
  if (!id || typeof id !== 'string') return res.status(400).json({ message: 'Invalid customer invoice ID' });

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const createdBy = await resolveCreatedBy(req.user?.id, client);
      const result = await postCustomerInvoice(client, id, createdBy);
      await client.query('COMMIT');

      return res.status(200).json({
        message: 'Customer invoice posted successfully. General Ledger and Chart of Accounts updated.',
        ...result,
      });
    } catch (err: any) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (dbError: any) {
    console.error('[post invoice] DB error, falling back to local store:', dbError.message);

    // Try local store first (for invoices created offline)
    const stored = getStoredInvoiceById(id);
    if (stored) {
      if (stored.status === 'Posted' || stored.status === 'Paid') {
        return res.status(200).json({
          message: 'Customer invoice is already posted.',
          journalEntryId: null,
          entryNumber: null,
        });
      }
      const newStatus = (stored.paid_amount >= stored.total_amount - 0.01) ? 'Paid' : 'Posted';
      updateStoredInvoice(id, { status: newStatus as any });
      return res.status(200).json({
        message: 'Customer invoice posted successfully (local mode).',
        journalEntryId: null,
        entryNumber: null,
        new_status: newStatus,
      });
    }

    // Invoice exists in DB but the posting query itself failed — surface the real error
    return res.status(500).json({
      message: `Failed to post customer invoice: ${dbError.message}`,
    });
  }
}

export default requirePermission('canCreateTransactions', handler);
