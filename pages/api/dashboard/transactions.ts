import { NextApiResponse } from 'next';
import { AuthenticatedRequest, authenticateToken } from '@/lib/auth-middleware';
import { isDbAvailable } from '@/lib/db-safe';
import { getSalesOrders, getPurchaseOrders, getCustomerInvoices, getVendorBills, getPayments, saveSalesOrders, savePurchaseOrders, saveCustomerInvoices, saveVendorBills, savePayments } from '@/lib/mock-data';
import { pool } from '@/lib/db';
import { randomUUID } from 'crypto';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method === 'GET') return handleGetTransactions(req, res);
  if (req.method === 'POST') return handleCreateTransaction(req, res);
  return res.status(405).json({ message: 'Method not allowed' });
}

async function handleGetTransactions(req: AuthenticatedRequest, res: NextApiResponse) {
  const { limit = '50' } = req.query;
  const dbOk = await isDbAvailable();

  if (!dbOk) {
    // Build unified transaction list from mock data
    const all = [
      ...getSalesOrders().map((o: any) => ({ id: o.id, date: o.created_at, type: 'SO', reference_no: o.order_number, partner: o.customer_name, amount: o.total_amount, status: o.status, due_date: o.delivery_date, notes: o.notes })),
      ...getPurchaseOrders().map((o: any) => ({ id: o.id, date: o.created_at, type: 'PO', reference_no: o.order_number, partner: o.vendor_name, amount: o.total_amount, status: o.status, due_date: o.expected_date, notes: o.notes })),
      ...getCustomerInvoices().map((i: any) => ({ id: i.id, date: i.created_at, type: 'Invoice', reference_no: i.invoice_number, partner: i.customer_name, amount: i.total_amount, status: i.status, due_date: i.due_date, notes: i.notes })),
      ...getVendorBills().map((b: any) => ({ id: b.id, date: b.created_at, type: 'Bill', reference_no: b.bill_number, partner: b.vendor_name, amount: b.total_amount, status: b.status, due_date: b.due_date, notes: b.notes })),
      ...getPayments().map((p: any) => ({ id: p.id, date: p.created_at, type: 'Payment', reference_no: p.payment_number, partner: p.partner_name || 'General', amount: p.amount, status: 'Paid', due_date: null, notes: p.notes })),
    ];
    all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const lim = parseInt(limit as string) || 50;
    return res.status(200).json({ transactions: all.slice(0, lim), source: 'mock' });
  }

  try {
    const result = await pool.query(`
      SELECT id::text, created_at as date, 'SO' as type, order_number as reference_no,
        c.name as partner, so.total_amount as amount, so.status, so.delivery_date as due_date, so.notes
      FROM sales_orders so LEFT JOIN contacts c ON so.customer_id = c.id
      UNION ALL
      SELECT id::text, created_at as date, 'PO' as type, order_number as reference_no,
        c.name as partner, po.total_amount as amount, po.status, po.expected_date as due_date, po.notes
      FROM purchase_orders po LEFT JOIN contacts c ON po.vendor_id = c.id
      UNION ALL
      SELECT id::text, created_at as date, 'Invoice' as type, invoice_number as reference_no,
        c.name as partner, ci.total_amount as amount, ci.status, ci.due_date, ci.notes
      FROM customer_invoices ci LEFT JOIN contacts c ON ci.customer_id = c.id
      UNION ALL
      SELECT id::text, created_at as date, 'Bill' as type, bill_number as reference_no,
        c.name as partner, vb.total_amount as amount, vb.status, vb.due_date, vb.notes
      FROM vendor_bills vb LEFT JOIN contacts c ON vb.vendor_id = c.id
      UNION ALL
      SELECT id::text, created_at as date, 'Payment' as type, payment_number as reference_no,
        COALESCE(c.name, 'General') as partner, p.amount, 'Paid' as status, NULL::date as due_date, p.notes
      FROM payments p LEFT JOIN contacts c ON p.partner_id = c.id
      ORDER BY date DESC LIMIT $1
    `, [parseInt(limit as string) || 50]);
    return res.status(200).json({ transactions: result.rows });
  } catch (error: any) {
    console.error('Dashboard transactions fetch error:', error.message);
    // Fall back to mock data instead of empty
    const all = [
      ...getSalesOrders().map((o: any) => ({ id: o.id, date: o.created_at, type: 'SO', reference_no: o.order_number, partner: o.customer_name, amount: o.total_amount, status: o.status })),
      ...getCustomerInvoices().map((i: any) => ({ id: i.id, date: i.created_at, type: 'Invoice', reference_no: i.invoice_number, partner: i.customer_name, amount: i.total_amount, status: i.status })),
      ...getVendorBills().map((b: any) => ({ id: b.id, date: b.created_at, type: 'Bill', reference_no: b.bill_number, partner: b.vendor_name, amount: b.total_amount, status: b.status })),
    ];
    all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return res.status(200).json({ transactions: all.slice(0, 50), source: 'mock' });
  }
}

async function handleCreateTransaction(req: AuthenticatedRequest, res: NextApiResponse) {
  const { type, partner, amount, dueDate, notes, itemDesc } = req.body;
  if (!type || !partner || !amount) return res.status(400).json({ message: 'type, partner, and amount are required' });
  const parsedAmount = parseFloat(amount) || 0;
  const dbOk = await isDbAvailable();

  if (!dbOk) {
    // Save to appropriate mock store
    const rand = Math.floor(1000 + Math.random() * 9000);
    const year = new Date().getFullYear();
    const now = new Date().toISOString();
    let newTx: any;
    if (type === 'SO') {
      const orders = getSalesOrders();
      newTx = { id: randomUUID(), order_number: `SO-${year}-${rand}`, customer_name: partner, customer_id: null, total_amount: parsedAmount, subtotal: parsedAmount, tax_amount: 0, status: 'Draft', order_date: now.split('T')[0], delivery_date: dueDate || null, notes: notes || itemDesc || null, created_at: now };
      orders.unshift(newTx);
      saveSalesOrders(orders);
      return res.status(201).json({ message: 'Sales order created', transaction: { id: newTx.id, reference_no: newTx.order_number, type: 'SO', partner, amount: parsedAmount, status: 'Draft', date: now }, source: 'mock' });
    } else if (type === 'Invoice') {
      const invoices = getCustomerInvoices();
      newTx = { id: randomUUID(), invoice_number: `INV-${year}-${rand}`, customer_name: partner, customer_id: null, total_amount: parsedAmount, subtotal: parsedAmount, tax_amount: 0, paid_amount: 0, balance_due: parsedAmount, status: 'Sent', invoice_date: now.split('T')[0], due_date: dueDate || null, notes: notes || null, created_at: now };
      invoices.unshift(newTx);
      saveCustomerInvoices(invoices);
      return res.status(201).json({ message: 'Invoice created', transaction: { id: newTx.id, reference_no: newTx.invoice_number, type: 'Invoice', partner, amount: parsedAmount, status: 'Sent', date: now }, source: 'mock' });
    } else if (type === 'Bill') {
      const bills = getVendorBills();
      newTx = { id: randomUUID(), bill_number: `BILL-${year}-${rand}`, vendor_name: partner, vendor_id: null, total_amount: parsedAmount, subtotal: parsedAmount, tax_amount: 0, paid_amount: 0, balance_due: parsedAmount, status: 'Received', bill_date: now.split('T')[0], due_date: dueDate || null, notes: notes || null, created_at: now };
      bills.unshift(newTx);
      saveVendorBills(bills);
      return res.status(201).json({ message: 'Bill created', transaction: { id: newTx.id, reference_no: newTx.bill_number, type: 'Bill', partner, amount: parsedAmount, status: 'Received', date: now }, source: 'mock' });
    } else if (type === 'Payment') {
      const payments = getPayments();
      newTx = { id: randomUUID(), payment_number: `PAY-${year}-${rand}`, partner_name: partner, payment_type: 'Payment', payment_method: 'Bank Transfer', amount: parsedAmount, payment_date: now.split('T')[0], notes: notes || null, status: 'Completed', created_at: now };
      payments.unshift(newTx);
      savePayments(payments);
      return res.status(201).json({ message: 'Payment recorded', transaction: { id: newTx.id, reference_no: newTx.payment_number, type: 'Payment', partner, amount: parsedAmount, status: 'Paid', date: now }, source: 'mock' });
    }
    return res.status(400).json({ message: 'Invalid transaction type' });
  }

  try {
    const rand = Math.floor(100 + Math.random() * 900);
    let result;
    if (type === 'SO') {
      result = await pool.query(`INSERT INTO sales_orders (order_number, customer_id, total_amount, status, delivery_date, notes, created_by) VALUES ($1,NULL,$2,'Draft',$3,$4,$5) RETURNING id::text, order_number as reference_no, 'SO' as type, total_amount as amount, status, created_at as date`, [`SO-2026-${rand}`, parsedAmount, dueDate || null, notes || null, req.user?.id || null]);
    } else if (type === 'Invoice') {
      result = await pool.query(`INSERT INTO customer_invoices (invoice_number, customer_id, invoice_date, due_date, total_amount, status, notes, created_by) VALUES ($1,NULL,NOW(),$2,$3,'Sent',$4,$5) RETURNING id::text, invoice_number as reference_no, 'Invoice' as type, total_amount as amount, status, created_at as date`, [`INV-2026-${rand}`, dueDate || null, parsedAmount, notes || null, req.user?.id || null]);
    } else if (type === 'Bill') {
      result = await pool.query(`INSERT INTO vendor_bills (bill_number, vendor_id, bill_date, due_date, total_amount, status, notes, created_by) VALUES ($1,NULL,NOW(),$2,$3,'Received',$4,$5) RETURNING id::text, bill_number as reference_no, 'Bill' as type, total_amount as amount, status, created_at as date`, [`BILL-2026-${rand}`, dueDate || null, parsedAmount, notes || null, req.user?.id || null]);
    } else {
      return res.status(400).json({ message: 'Invalid transaction type' });
    }
    return res.status(201).json({ message: 'Transaction created successfully', transaction: result!.rows[0] });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to create transaction', error: error.message });
  }
}

export default authenticateToken(handler);
