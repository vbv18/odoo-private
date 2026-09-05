import { NextApiResponse } from 'next';
import { pool } from '@/lib/db';
import { AuthenticatedRequest, authenticateToken } from '@/lib/auth-middleware';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  const { id } = req.query;
  if (!id || typeof id !== 'string') return res.status(400).json({ message: 'Invalid vendor bill ID' });

  const client = await pool.connect();
  try {
    const { amount, payment_date, payment_method, notes } = req.body;
    const paymentAmount = parseFloat(amount);
    if (!paymentAmount || paymentAmount <= 0) {
      return res.status(400).json({ message: 'Payment amount must be greater than 0' });
    }
    const payDate = payment_date || new Date().toISOString().split('T')[0];
    const payMethod = payment_method || 'Bank';

    await client.query('BEGIN');

    // 1. Fetch the bill
    const billRes = await client.query('SELECT * FROM vendor_bills WHERE id = $1', [id]);
    if (billRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Vendor bill not found' });
    }
    const bill = billRes.rows[0];
    const totalAmount = parseFloat(bill.total_amount) || 0;
    const currentPaid = parseFloat(bill.paid_amount) || 0;
    const balanceDue = totalAmount - currentPaid;

    if (paymentAmount > balanceDue + 0.01) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        message: `Payment amount (${paymentAmount}) exceeds balance due (${balanceDue.toFixed(2)})`,
      });
    }

    const newPaidAmount = currentPaid + paymentAmount;
    const newStatus = newPaidAmount >= totalAmount - 0.01 ? 'Paid' : 'Posted';

    // 2. Update Vendor Bill
    await client.query(
      `UPDATE vendor_bills 
       SET paid_amount = $1, status = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3`,
      [newPaidAmount, newStatus, id]
    );

    // 3. Generate Payment Number: PAY-YYYY-XXXX
    const countRes = await client.query('SELECT COUNT(*) FROM payments');
    const seq = parseInt(countRes.rows[0].count, 10) + 1;
    const payment_number = `PAY-${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`;

    // 4. Insert Payment record
    const paymentRes = await client.query(
      `INSERT INTO payments 
        (payment_number, payment_type, payment_method, partner_id, payment_date, amount, reference_type, reference_id, reference_number, notes, created_by)
       VALUES ($1, 'Payment', $2, $3, $4, $5, 'Bill', $6, $7, $8, $9)
       RETURNING *`,
      [
        payment_number,
        payMethod,
        bill.vendor_id,
        payDate,
        paymentAmount,
        bill.id,
        bill.bill_number,
        notes || `Payment for Bill ${bill.bill_number}`,
        req.user?.id || null,
      ]
    );

    // 5. Auto-create double-entry Journal Entry
    // Find Accounts Payable (2110) and Bank/Cash (1120 or 1110) accounts
    const apRes = await client.query("SELECT id FROM chart_of_accounts WHERE account_code = '2110' LIMIT 1");
    const bankCode = payMethod === 'Cash' ? '1110' : '1120';
    const bankRes = await client.query("SELECT id FROM chart_of_accounts WHERE account_code = $1 LIMIT 1", [bankCode]);

    // Find or create default Purchase Journal
    const journalRes = await client.query("SELECT id FROM journals WHERE journal_type = 'Bank' OR journal_type = 'Cash' LIMIT 1");
    const journalId = journalRes.rows[0]?.id || null;

    if (journalId && apRes.rows.length > 0 && bankRes.rows.length > 0) {
      const apAccountId = apRes.rows[0].id;
      const bankAccountId = bankRes.rows[0].id;

      const jeCountRes = await client.query('SELECT COUNT(*) FROM journal_entries');
      const jeSeq = parseInt(jeCountRes.rows[0].count, 10) + 1;
      const entry_number = `JE-${new Date().getFullYear()}-${String(jeSeq).padStart(4, '0')}`;

      const jeRes = await client.query(
        `INSERT INTO journal_entries 
          (entry_number, journal_id, entry_date, reference_type, reference_id, reference_number, description, status, total_debit, total_credit, created_by)
         VALUES ($1, $2, $3, 'Payment', $4, $5, $6, 'Posted', $7, $7, $8)
         RETURNING id`,
        [
          entry_number,
          journalId,
          payDate,
          bill.id,
          bill.bill_number,
          `Payment for ${bill.bill_number}`,
          paymentAmount,
          req.user?.id || null,
        ]
      );
      const jeId = jeRes.rows[0].id;

      // Debit line: Accounts Payable (reduces liability)
      await client.query(
        `INSERT INTO journal_entry_items 
          (journal_entry_id, account_id, description, debit_amount, credit_amount, partner_id)
         VALUES ($1, $2, $3, $4, 0, $5)`,
        [jeId, apAccountId, `Payment to vendor for ${bill.bill_number}`, paymentAmount, bill.vendor_id]
      );

      // Credit line: Bank/Cash (reduces asset)
      await client.query(
        `INSERT INTO journal_entry_items 
          (journal_entry_id, account_id, description, debit_amount, credit_amount, partner_id)
         VALUES ($1, $2, $3, 0, $4, $5)`,
        [jeId, bankAccountId, `Payment from ${bankCode} for ${bill.bill_number}`, paymentAmount, bill.vendor_id]
      );

      // Update balances in Chart of Accounts
      await client.query('UPDATE chart_of_accounts SET current_balance = current_balance - $1 WHERE id = $2', [paymentAmount, apAccountId]);
      await client.query('UPDATE chart_of_accounts SET current_balance = current_balance - $1 WHERE id = $2', [paymentAmount, bankAccountId]);
    }

    await client.query('COMMIT');
    return res.status(200).json({
      message: 'Payment registered successfully',
      payment: paymentRes.rows[0],
      new_status: newStatus,
      paid_amount: newPaidAmount,
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    return res.status(500).json({ message: 'Failed to register payment', error: error.message });
  } finally {
    client.release();
  }
}

export default authenticateToken(handler);
