'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

interface BudgetRow {
  id: string;
  budget_name: string;
  analytic_account_name: string | null;
  period_start: string;
  period_end: string;
  planned_amount: number;
  achieved_amount: number;
  status: string;
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default function BudgetReportPage() {
  const router = useRouter();
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchBudgets(token);
  }, [router]);

  const fetchBudgets = async (token: string) => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/budgets', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBudgets(data.budgets || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const totalPlanned = budgets.reduce((sum, b) => sum + (parseFloat(String(b.planned_amount)) || 0), 0);
  const totalAchieved = budgets.reduce((sum, b) => sum + (parseFloat(String(b.achieved_amount)) || 0), 0);
  const totalRemaining = totalPlanned - totalAchieved;

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[24px] font-semibold text-[#111827]">Budget Variance Report</h1>
          <p className="text-[14px] text-[#667085] mt-1">Comparison of budgeted financial allocations vs actual ledger spend</p>
        </div>
        <Button variant="secondary" onClick={() => window.print()} className="text-[12px]">
          Print Variance Report
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-5">
          <span className="text-[12px] text-[#667085]">Total Planned Budget</span>
          <p className="text-[22px] font-semibold text-[#111827] mt-1">{formatCurrency(totalPlanned)}</p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-5">
          <span className="text-[12px] text-[#667085]">Actual Realized Spend</span>
          <p className="text-[22px] font-semibold text-green-600 mt-1">{formatCurrency(totalAchieved)}</p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-5">
          <span className="text-[12px] text-[#667085]">Available Balance</span>
          <p className={`text-[22px] font-semibold mt-1 ${totalRemaining >= 0 ? 'text-[#2563EB]' : 'text-[#DC2626]'}`}>
            {formatCurrency(totalRemaining)}
          </p>
        </div>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-enterprise overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-8 space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-enterprise" />
            ))}
          </div>
        ) : budgets.length === 0 ? (
          <div className="p-12 text-center text-[#667085] text-[14px]">
            No budgets configured. Go to Budgets to create your first spending plan.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F7F8FA] text-[11px] font-semibold text-[#667085] uppercase tracking-wide">
                <th className="text-left py-3 px-4">Budget / Cost Center</th>
                <th className="text-left py-3 px-4">Period</th>
                <th className="text-right py-3 px-4">Planned</th>
                <th className="text-right py-3 px-4">Actual Spend</th>
                <th className="text-right py-3 px-4">Variance (Remaining)</th>
                <th className="text-center py-3 px-4">% Spent</th>
                <th className="text-center py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {budgets.map((b) => {
                const plan = parseFloat(String(b.planned_amount)) || 1;
                const spend = parseFloat(String(b.achieved_amount)) || 0;
                const diff = plan - spend;
                const pct = Math.round((spend / plan) * 100);

                return (
                  <tr key={b.id} className="border-b border-[#F3F4F6] text-[13px] hover:bg-[#F7F8FA]">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-[#111827]">{b.budget_name}</p>
                      {b.analytic_account_name && (
                        <span className="text-[11px] text-[#667085]">{b.analytic_account_name}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[#667085]">
                      {new Date(b.period_start).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })} — {new Date(b.period_end).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-[#111827]">
                      {formatCurrency(plan)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-green-600">
                      {formatCurrency(spend)}
                    </td>
                    <td className={`py-3 px-4 text-right font-mono font-semibold ${diff >= 0 ? 'text-[#2563EB]' : 'text-[#DC2626]'}`}>
                      {formatCurrency(diff)}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        pct > 100 ? 'bg-red-100 text-red-700' : pct > 80 ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {pct}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 text-[11px] font-medium rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                        {b.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#111827] bg-[#F7F8FA] font-bold text-[14px]">
                <td colSpan={2} className="py-3 px-4 uppercase tracking-wide">Totals:</td>
                <td className="py-3 px-4 text-right font-mono text-[#111827]">{formatCurrency(totalPlanned)}</td>
                <td className="py-3 px-4 text-right font-mono text-green-600">{formatCurrency(totalAchieved)}</td>
                <td className={`py-3 px-4 text-right font-mono ${totalRemaining >= 0 ? 'text-[#2563EB]' : 'text-[#DC2626]'}`}>
                  {formatCurrency(totalRemaining)}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
