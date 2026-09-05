import { NextApiResponse } from 'next';
import { pool } from '@/lib/db';
import { AuthenticatedRequest, requirePermission } from '@/lib/auth-middleware';
import { postCustomerInvoice } from '@/lib/accounting-helpers';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  const { id } = req.query;
  if (!id || typeof id !== 'string') return res.status(400).json({ message: 'Invalid customer invoice ID' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await postCustomerInvoice(client, id, req.user?.id || null);
    await client.query('COMMIT');

    return res.status(200).json({
      message: 'Customer invoice posted successfully. General Ledger and Chart of Accounts updated.',
      ...result,
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    return res.status(500).json({ message: error.message || 'Failed to post customer invoice' });
  } finally {
    client.release();
  }
}

export default requirePermission('canCreateTransactions', handler);
