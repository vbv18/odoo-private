import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { isDbAvailable } from '@/lib/db-safe';
import { getDashboardStats } from '@/lib/mock-data';
import { pool } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ message: 'Unauthorized' });
  try {
    jwt.verify(authHeader.substring(7), process.env.JWT_SECRET || 'your-secret-key');
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }

  const dbOk = await isDbAvailable();
  if (!dbOk) {
    const stats = getDashboardStats();
    return res.status(200).json({ ...stats, source: 'mock', lastUpdated: new Date().toISOString() });
  }

  try {
    const [invoiceRes, billRes, payRes] = await Promise.all([
      pool.query(`SELECT COALESCE(SUM(total_amount),0) as total_revenue, COUNT(*) FILTER (WHERE status IN ('Sent','Overdue')) as pending, COUNT(*) FILTER (WHERE status='Overdue') as overdue FROM customer_invoices`),
      pool.query(`SELECT COALESCE(SUM(total_amount),0) as total_expenses FROM vendor_bills WHERE status='Paid'`),
      pool.query(`SELECT COALESCE(SUM(amount),0) FILTER (WHERE payment_type='Receipt') as receipts, COALESCE(SUM(amount),0) FILTER (WHERE payment_type='Payment') as payments FROM payments`),
    ]);

    const totalRevenue = parseFloat(invoiceRes.rows[0].total_revenue);
    const totalExpenses = parseFloat(billRes.rows[0].total_expenses);

    return res.status(200).json({
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      pendingInvoices: parseInt(invoiceRes.rows[0].pending),
      overdueInvoices: parseInt(invoiceRes.rows[0].overdue),
      cashBalance: parseFloat(payRes.rows[0].receipts) - parseFloat(payRes.rows[0].payments),
      lastUpdated: new Date().toISOString(),
    });
  } catch {
    const stats = getDashboardStats();
    return res.status(200).json({ ...stats, source: 'mock', lastUpdated: new Date().toISOString() });
  }
}
