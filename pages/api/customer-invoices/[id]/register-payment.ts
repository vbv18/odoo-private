import { NextApiResponse } from 'next';
import { pool } from '@/lib/db';
import { AuthenticatedRequest, authenticateToken } from '@/lib/auth-middleware';
import { postCustomerInvoice } from '@/lib/accounting-helpers';
import { getStoredInvoiceById, updateStoredInvoice } from '@/lib/invoices-store';
import { saveStoredPayment } from '@/lib/payments-store';
import { resolveCreatedBy } from '@/lib/db-users';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  const { id } = req.query;
  if (!id || typeof id !== 'string') return res.status(400).json({ message: 'Invalid customer invoice ID' });

  const { amount, payment_date, payment_method, notes } = req.body;
  const paymentAmount = parseFloat(amount);
  if (!paymentAmount || paymentAmount <= 0) {
    return res.status(400).json({ message: 'Payment amount must be greater than 0' });
  }
  const payDate = payment_date || new Date().toISOString().split('T')[0];
  const payMethod = payment_method || 'Bank';

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const invRes = await client.query('SELECT * FROM customer_invoices WHERE id = $1', [id]);
      if (invRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Customer invoice not found' });
      }
      const invoice = invRes.rows[0];
      const totalAmount = parseFloat(invoice.total_amount) || 0;
      const currentPaid = parseFloat(invoice.paid_amount) || 0;
      const balanceDue = totalAmount - currentPaid;

      if (paymentAmount > balanceDue + 0.01) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          message: `Payment amount (${paymentAmount}) exceeds balance due (${balanceDue.toFixed(2)})`,
        });
      }

      // Ensure the invoice is posted to the general ledger first
      const createdBy = await resolveCreatedBy(req.user?.id, client);
      if (!invoice.journal_entry_id) {
        await postCustomerInvoice(client, id, createdBy);
      }

      const newPaidAmount = currentPaid + paymentAmount;
      const newStatus = newPaidAmount >= totalAmount - 0.01 ? 'Paid' : 'Posted';

      await client.query(
        `UPDATE customer_invoices 
         SET paid_amount = $1, status = $2, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $3`,
        [newPaidAmount, newStatus, id]
      );

      const countRes = await client.query('SELECT COUNT(*) FROM payments');
      const seq = parseInt(countRes.rows[0].count, 10) + 1;
      const payment_number = `REC-${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`;

      const paymentRes = await client.query(
        `INSERT INTO payments 
          (payment_number, payment_type, payment_method, partner_id, payment_date, amount, reference_type, reference_id, reference_number, notes)
         VALUES ($1, 'Receipt', $2, $3, $4, $5, 'Invoice', $6, $7, $8)
         RETURNING *`,
        [
          payment_number,
          payMethod,
          invoice.customer_id,
          payDate,
          paymentAmount,
          id,
          invoice.invoice_number,
          notes || `Payment for invoice ${invoice.invoice_number}`,
        ]
      );

      await client.query('COMMIT');
      return res.status(200).json({
        message: 'Customer payment received and recorded successfully',
        payment: paymentRes.rows[0],
        new_status: newStatus,
        paid_amount: newPaidAmount,
      });
    } catch (err: any) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (dbError: any) {
    // Local fallback
    const stored = getStoredInvoiceById(id);
    if (!stored) {
      return res.status(404).json({ message: 'Customer invoice not found' });
    }

    const currentPaid = stored.paid_amount || 0;
    const newPaidAmount = currentPaid + paymentAmount;
    const newStatus = newPaidAmount >= stored.total_amount - 0.01 ? 'Paid' : 'Posted';
    const balanceDue = Math.max(0, stored.total_amount - newPaidAmount);

    const payment = saveStoredPayment({
      payment_type: 'Receipt',
      payment_method: payMethod,
      partner_id: stored.customer_id,
      partner_name: stored.customer_name,
      payment_date: payDate,
      amount: paymentAmount,
      reference_type: 'Invoice',
      reference_id: stored.id,
      reference_number: stored.invoice_number,
      notes: notes || `Payment for invoice ${stored.invoice_number}`,
      created_by: req.user?.id || null,
    });

    const updatedPayments = [...(stored.payments || []), payment];
    updateStoredInvoice(id, {
      paid_amount: newPaidAmount,
      balance_due: balanceDue,
      status: newStatus as any,
      payments: updatedPayments,
    });

    return res.status(200).json({
      message: 'Customer payment received and recorded successfully',
      payment,
      new_status: newStatus,
      paid_amount: newPaidAmount,
    });
  }
}

export default authenticateToken(handler);
