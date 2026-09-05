import { PoolClient } from 'pg';

export interface PostResult {
  journalEntryId: string;
  entryNumber: string;
}

/**
 * Posts a Customer Invoice to the General Ledger:
 * - Creates a posted Journal Entry in the Sales Journal (SAL)
 * - Line 1: Debit Accounts Receivable (1130) by total_amount
 * - Line 2: Credit Sales Revenue (4100) by subtotal
 * - Line 3: Credit Tax Payable (2120) by tax_amount (if > 0)
 * - Updates Chart of Accounts balances
 * - Sets invoice.journal_entry_id and updates status to 'Posted' or 'Paid'
 */
export async function postCustomerInvoice(
  client: PoolClient,
  invoiceId: string,
  userId: string | null = null
): Promise<PostResult | null> {
  const invRes = await client.query(
    'SELECT * FROM customer_invoices WHERE id = $1 FOR UPDATE',
    [invoiceId]
  );
  if (invRes.rows.length === 0) {
    throw new Error('Customer invoice not found');
  }
  const invoice = invRes.rows[0];

  // If already posted to journal, return existing
  if (invoice.journal_entry_id) {
    const existingJe = await client.query(
      'SELECT entry_number FROM journal_entries WHERE id = $1',
      [invoice.journal_entry_id]
    );
    return {
      journalEntryId: invoice.journal_entry_id,
      entryNumber: existingJe.rows[0]?.entry_number || '',
    };
  }

  const subtotal = parseFloat(invoice.subtotal) || 0;
  const taxAmount = parseFloat(invoice.tax_amount) || 0;
  const totalAmount = parseFloat(invoice.total_amount) || 0;
  const paidAmount = parseFloat(invoice.paid_amount) || 0;

  // 1. Find Accounts
  const arRes = await client.query("SELECT id FROM chart_of_accounts WHERE account_code = '1130' LIMIT 1");
  const revRes = await client.query("SELECT id FROM chart_of_accounts WHERE account_code = '4100' LIMIT 1");
  const taxRes = await client.query("SELECT id FROM chart_of_accounts WHERE account_code = '2120' LIMIT 1");

  if (arRes.rows.length === 0 || revRes.rows.length === 0) {
    throw new Error('Required chart of accounts (1130 AR or 4100 Sales Revenue) not found');
  }

  const arAccountId = arRes.rows[0].id;
  const revAccountId = revRes.rows[0].id;
  const taxAccountId = taxRes.rows[0]?.id || null;

  // 2. Find Sales Journal
  const journalRes = await client.query(
    "SELECT id FROM journals WHERE journal_type = 'Sales' OR code = 'SAL' LIMIT 1"
  );
  const journalId = journalRes.rows[0]?.id || null;
  if (!journalId) {
    throw new Error('Sales journal not found');
  }

  // 3. Generate entry number: JE-YYYY-XXXX
  const jeCountRes = await client.query('SELECT COUNT(*) FROM journal_entries');
  const jeSeq = parseInt(jeCountRes.rows[0].count, 10) + 1;
  const entryNumber = `JE-${new Date().getFullYear()}-${String(jeSeq).padStart(4, '0')}`;

  const invDate = invoice.invoice_date
    ? new Date(invoice.invoice_date).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  // 4. Create Journal Entry
  const jeRes = await client.query(
    `INSERT INTO journal_entries 
      (entry_number, journal_id, entry_date, reference_type, reference_id, reference_number, description, status, total_debit, total_credit, created_by)
     VALUES ($1, $2, $3, 'Invoice', $4, $5, $6, 'Posted', $7, $7, $8)
     RETURNING id`,
    [
      entryNumber,
      journalId,
      invDate,
      invoice.id,
      invoice.invoice_number,
      `Invoice ${invoice.invoice_number}`,
      totalAmount,
      userId,
    ]
  );
  const jeId = jeRes.rows[0].id;

  // 5. Line 1: Debit Accounts Receivable (Asset increases)
  await client.query(
    `INSERT INTO journal_entry_items 
      (journal_entry_id, account_id, description, debit_amount, credit_amount, partner_id)
     VALUES ($1, $2, $3, $4, 0, $5)`,
    [jeId, arAccountId, `AR for Invoice ${invoice.invoice_number}`, totalAmount, invoice.customer_id]
  );

  // 6. Line 2: Credit Sales Revenue (Income increases)
  await client.query(
    `INSERT INTO journal_entry_items 
      (journal_entry_id, account_id, description, debit_amount, credit_amount, partner_id)
     VALUES ($1, $2, $3, 0, $4, $5)`,
    [jeId, revAccountId, `Sales Revenue for Invoice ${invoice.invoice_number}`, subtotal, invoice.customer_id]
  );

  // 7. Line 3: Credit Tax Payable (Liability increases if tax > 0)
  if (taxAmount > 0 && taxAccountId) {
    await client.query(
      `INSERT INTO journal_entry_items 
        (journal_entry_id, account_id, description, debit_amount, credit_amount, partner_id)
       VALUES ($1, $2, $3, 0, $4, $5)`,
      [jeId, taxAccountId, `GST / Tax for Invoice ${invoice.invoice_number}`, taxAmount, invoice.customer_id]
    );
  }

  // 8. Update Chart of Accounts balances
  // Asset: debit increases balance
  await client.query(
    'UPDATE chart_of_accounts SET current_balance = current_balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [totalAmount, arAccountId]
  );
  // Income: credit increases balance
  await client.query(
    'UPDATE chart_of_accounts SET current_balance = current_balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [subtotal, revAccountId]
  );
  // Liability: credit increases balance
  if (taxAmount > 0 && taxAccountId) {
    await client.query(
      'UPDATE chart_of_accounts SET current_balance = current_balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [taxAmount, taxAccountId]
    );
  }

  // 9. Update invoice status and journal_entry_id
  const finalStatus = paidAmount >= totalAmount - 0.01 ? 'Paid' : 'Posted';
  await client.query(
    `UPDATE customer_invoices 
     SET journal_entry_id = $1, status = $2, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $3`,
    [jeId, finalStatus, invoice.id]
  );

  return { journalEntryId: jeId, entryNumber };
}

/**
 * Posts a Vendor Bill to the General Ledger:
 * - Creates a posted Journal Entry in the Purchase Journal (PUR)
 * - Line 1: Debit Cost of Goods Sold (5100) by subtotal
 * - Line 2: Debit Tax Payable (2120) by tax_amount (offsets tax liability)
 * - Line 3: Credit Accounts Payable (2110) by total_amount
 * - Updates Chart of Accounts balances
 * - Sets bill.journal_entry_id and updates status to 'Posted' or 'Paid'
 */
export async function postVendorBill(
  client: PoolClient,
  billId: string,
  userId: string | null = null
): Promise<PostResult | null> {
  const billRes = await client.query(
    'SELECT * FROM vendor_bills WHERE id = $1 FOR UPDATE',
    [billId]
  );
  if (billRes.rows.length === 0) {
    throw new Error('Vendor bill not found');
  }
  const bill = billRes.rows[0];

  // If already posted to journal, return existing
  if (bill.journal_entry_id) {
    const existingJe = await client.query(
      'SELECT entry_number FROM journal_entries WHERE id = $1',
      [bill.journal_entry_id]
    );
    return {
      journalEntryId: bill.journal_entry_id,
      entryNumber: existingJe.rows[0]?.entry_number || '',
    };
  }

  const subtotal = parseFloat(bill.subtotal) || 0;
  const taxAmount = parseFloat(bill.tax_amount) || 0;
  const totalAmount = parseFloat(bill.total_amount) || 0;
  const paidAmount = parseFloat(bill.paid_amount) || 0;

  // 1. Find Accounts
  const cogsRes = await client.query("SELECT id FROM chart_of_accounts WHERE account_code = '5100' LIMIT 1");
  const apRes = await client.query("SELECT id FROM chart_of_accounts WHERE account_code = '2110' LIMIT 1");
  const taxRes = await client.query("SELECT id FROM chart_of_accounts WHERE account_code = '2120' LIMIT 1");

  if (cogsRes.rows.length === 0 || apRes.rows.length === 0) {
    throw new Error('Required chart of accounts (5100 COGS or 2110 AP) not found');
  }

  const cogsAccountId = cogsRes.rows[0].id;
  const apAccountId = apRes.rows[0].id;
  const taxAccountId = taxRes.rows[0]?.id || null;

  // 2. Find Purchase Journal
  const journalRes = await client.query(
    "SELECT id FROM journals WHERE journal_type = 'Purchase' OR code = 'PUR' LIMIT 1"
  );
  const journalId = journalRes.rows[0]?.id || null;
  if (!journalId) {
    throw new Error('Purchase journal not found');
  }

  // 3. Generate entry number: JE-YYYY-XXXX
  const jeCountRes = await client.query('SELECT COUNT(*) FROM journal_entries');
  const jeSeq = parseInt(jeCountRes.rows[0].count, 10) + 1;
  const entryNumber = `JE-${new Date().getFullYear()}-${String(jeSeq).padStart(4, '0')}`;

  const billDate = bill.bill_date
    ? new Date(bill.bill_date).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  // 4. Create Journal Entry
  const jeRes = await client.query(
    `INSERT INTO journal_entries 
      (entry_number, journal_id, entry_date, reference_type, reference_id, reference_number, description, status, total_debit, total_credit, created_by)
     VALUES ($1, $2, $3, 'Bill', $4, $5, $6, 'Posted', $7, $7, $8)
     RETURNING id`,
    [
      entryNumber,
      journalId,
      billDate,
      bill.id,
      bill.bill_number,
      `Vendor Bill ${bill.bill_number}`,
      totalAmount,
      userId,
    ]
  );
  const jeId = jeRes.rows[0].id;

  // 5. Line 1: Debit Cost of Goods Sold (Expense increases)
  await client.query(
    `INSERT INTO journal_entry_items 
      (journal_entry_id, account_id, description, debit_amount, credit_amount, partner_id)
     VALUES ($1, $2, $3, $4, 0, $5)`,
    [jeId, cogsAccountId, `Cost of Goods for Bill ${bill.bill_number}`, subtotal, bill.vendor_id]
  );

  // 6. Line 2: Debit Tax Payable (Input tax reduces liability)
  if (taxAmount > 0 && taxAccountId) {
    await client.query(
      `INSERT INTO journal_entry_items 
        (journal_entry_id, account_id, description, debit_amount, credit_amount, partner_id)
       VALUES ($1, $2, $3, $4, 0, $5)`,
      [jeId, taxAccountId, `Input GST for Bill ${bill.bill_number}`, taxAmount, bill.vendor_id]
    );
  }

  // 7. Line 3: Credit Accounts Payable (Liability increases)
  await client.query(
    `INSERT INTO journal_entry_items 
      (journal_entry_id, account_id, description, debit_amount, credit_amount, partner_id)
     VALUES ($1, $2, $3, 0, $4, $5)`,
    [jeId, apAccountId, `AP for Bill ${bill.bill_number}`, totalAmount, bill.vendor_id]
  );

  // 8. Update Chart of Accounts balances
  // Expense: debit increases balance
  await client.query(
    'UPDATE chart_of_accounts SET current_balance = current_balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [subtotal, cogsAccountId]
  );
  // Liability (Tax Payable): debit decreases balance
  if (taxAmount > 0 && taxAccountId) {
    await client.query(
      'UPDATE chart_of_accounts SET current_balance = current_balance - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [taxAmount, taxAccountId]
    );
  }
  // Liability (Accounts Payable): credit increases balance
  await client.query(
    'UPDATE chart_of_accounts SET current_balance = current_balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [totalAmount, apAccountId]
  );

  // 9. Update bill status and journal_entry_id
  const finalStatus = paidAmount >= totalAmount - 0.01 ? 'Paid' : 'Posted';
  await client.query(
    `UPDATE vendor_bills 
     SET journal_entry_id = $1, status = $2, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $3`,
    [jeId, finalStatus, bill.id]
  );

  return { journalEntryId: jeId, entryNumber };
}
