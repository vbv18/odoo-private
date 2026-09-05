import { NextApiResponse } from 'next';
import { AuthenticatedRequest, requirePermission } from '@/lib/auth-middleware';
import { isDbAvailable } from '@/lib/db-safe';
import { getChartOfAccounts, getCustomerInvoices, getVendorBills } from '@/lib/mock-data';
import { pool } from '@/lib/db';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  const { from, to } = req.query;
  const dbOk = await isDbAvailable();

  if (!dbOk) {
    // Build P&L from mock data
    const coa = getChartOfAccounts();
    const invoices = getCustomerInvoices();
    const bills = getVendorBills();

    const totalIncome = invoices.reduce((s: number, i: any) => s + i.total_amount, 0);
    const totalExpenses = bills.reduce((s: number, b: any) => s + b.total_amount, 0);
    const netProfit = totalIncome - totalExpenses;

    const income = coa.filter((a: any) => a.account_type === 'Income').map((a: any) => ({ ...a, current_balance: a.current_balance || 0 }));
    const expenses = coa.filter((a: any) => a.account_type === 'Expense').map((a: any) => ({ ...a, current_balance: a.current_balance || 0 }));

    return res.status(200).json({
      period: { from: from || '2026-04-01', to: to || new Date().toISOString().split('T')[0] },
      income, expenses, totalIncome, totalExpenses, netProfit,
      profitMargin: totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : '0',
      source: 'mock',
    });
  }

  try {
    const result = await pool.query(`
      SELECT id, account_code, account_name, account_type, current_balance
      FROM chart_of_accounts
      WHERE is_archived = false AND account_type IN ('Income', 'Expense')
      ORDER BY account_code ASC`);

    const income = result.rows.filter((r) => r.account_type === 'Income');
    const expenses = result.rows.filter((r) => r.account_type === 'Expense');
    const totalIncome = income.reduce((sum, i) => sum + (parseFloat(i.current_balance) || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + (parseFloat(e.current_balance) || 0), 0);
    const netProfit = totalIncome - totalExpenses;

    return res.status(200).json({
      period: { from: from || '2026-01-01', to: to || new Date().toISOString().split('T')[0] },
      income, expenses, totalIncome, totalExpenses, netProfit,
      profitMargin: totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : '0',
    });
  } catch {
    const invoices = getCustomerInvoices();
    const bills = getVendorBills();
    const totalIncome = invoices.reduce((s: number, i: any) => s + i.total_amount, 0);
    const totalExpenses = bills.reduce((s: number, b: any) => s + b.total_amount, 0);
    return res.status(200).json({
      period: { from: from || '2026-04-01', to: to || new Date().toISOString().split('T')[0] },
      income: [], expenses: [], totalIncome, totalExpenses, netProfit: totalIncome - totalExpenses,
      profitMargin: totalIncome > 0 ? (((totalIncome - totalExpenses) / totalIncome) * 100).toFixed(1) : '0',
      source: 'mock',
    });
  }
}

export default requirePermission('canViewAllReports', handler);
