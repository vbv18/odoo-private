import { NextApiResponse } from 'next';
import { AuthenticatedRequest, requirePermission } from '@/lib/auth-middleware';
import { isDbAvailable } from '@/lib/db-safe';
import { getChartOfAccounts, getCustomerInvoices, getVendorBills } from '@/lib/mock-data';
import { pool } from '@/lib/db';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  const { from, to } = req.query;
  const fromDate = typeof from === 'string' && from ? from : null;
  const toDate = typeof to === 'string' && to ? to : null;
  const periodFrom = fromDate || '2026-01-01';
  const periodTo = toDate || new Date().toISOString().split('T')[0];

  const dbOk = await isDbAvailable();

  if (!dbOk) {
    // Build P&L from mock data
    const coa = getChartOfAccounts();
    const invoices = getCustomerInvoices();
    const bills = getVendorBills();

    const totalIncome = invoices.reduce((s: number, i: any) => s + (parseFloat(i.total_amount) || 0), 0);
    const totalExpenses = bills.reduce((s: number, b: any) => s + (parseFloat(b.total_amount) || 0), 0);
    const netProfit = totalIncome - totalExpenses;

    const income = coa
      .filter((a: any) => a.account_type === 'Income')
      .map((a: any) => ({
        ...a,
        current_balance: a.account_code === '4100' && totalIncome > 0 ? totalIncome : (a.current_balance || 0),
      }));
    const expenses = coa
      .filter((a: any) => a.account_type === 'Expense')
      .map((a: any) => ({
        ...a,
        current_balance: a.account_code === '5100' && totalExpenses > 0 ? totalExpenses : (a.current_balance || 0),
      }));

    return res.status(200).json({
      period: { from: periodFrom, to: periodTo },
      income,
      expenses,
      totalIncome,
      totalExpenses,
      netProfit,
      profitMargin: totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : '0',
      source: 'mock',
    });
  }

  try {
    const result = await pool.query(
      `SELECT 
        coa.id, coa.account_code, coa.account_name, coa.account_type,
        coa.current_balance as account_balance,
        COALESCE(SUM(
          CASE 
            WHEN coa.account_type = 'Income' THEN (jei.credit_amount - jei.debit_amount)
            WHEN coa.account_type = 'Expense' THEN (jei.debit_amount - jei.credit_amount)
            ELSE 0
          END
        ), 0) as period_amount
      FROM chart_of_accounts coa
      LEFT JOIN journal_entry_items jei ON coa.id = jei.account_id
      LEFT JOIN journal_entries je ON jei.journal_entry_id = je.id 
        AND je.status = 'Posted'
        AND ($1::date IS NULL OR je.entry_date >= $1)
        AND ($2::date IS NULL OR je.entry_date <= $2)
      WHERE coa.is_archived = false AND coa.account_type IN ('Income', 'Expense')
      GROUP BY coa.id, coa.account_code, coa.account_name, coa.account_type, coa.current_balance
      ORDER BY coa.account_code ASC`,
      [fromDate, toDate]
    );

    const rows = result.rows.map((r) => {
      const periodAmt = parseFloat(r.period_amount) || 0;
      const acctBal = parseFloat(r.account_balance) || 0;
      // If date filter was applied, use period amount; otherwise period amount or account balance
      const finalBalance = fromDate || toDate ? periodAmt : (periodAmt !== 0 ? periodAmt : acctBal);
      return {
        id: r.id,
        account_code: r.account_code,
        account_name: r.account_name,
        account_type: r.account_type,
        current_balance: Math.max(0, finalBalance),
      };
    });

    const income = rows.filter((r) => r.account_type === 'Income');
    const expenses = rows.filter((r) => r.account_type === 'Expense');

    const totalIncome = income.reduce((sum, i) => sum + i.current_balance, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.current_balance, 0);
    const netProfit = totalIncome - totalExpenses;

    return res.status(200).json({
      period: { from: periodFrom, to: periodTo },
      income,
      expenses,
      totalIncome,
      totalExpenses,
      netProfit,
      profitMargin: totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : '0',
    });
  } catch (error: any) {
    const invoices = getCustomerInvoices();
    const bills = getVendorBills();
    const totalIncome = invoices.reduce((s: number, i: any) => s + (parseFloat(i.total_amount) || 0), 0);
    const totalExpenses = bills.reduce((s: number, b: any) => s + (parseFloat(b.total_amount) || 0), 0);
    return res.status(200).json({
      period: { from: periodFrom, to: periodTo },
      income: [],
      expenses: [],
      totalIncome,
      totalExpenses,
      netProfit: totalIncome - totalExpenses,
      profitMargin: totalIncome > 0 ? (((totalIncome - totalExpenses) / totalIncome) * 100).toFixed(1) : '0',
      source: 'mock',
    });
  }
}

export default requirePermission('canViewAllReports', handler);
