'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { PlusIcon } from '@/components/icons';

interface Budget {
  id: string;
  budget_name: string;
  analytic_account_name: string | null;
  period_start: string;
  period_end: string;
  planned_amount: number;
  achieved_amount: number;
  status: 'Active' | 'Closed' | 'Over Budget';
  responsible_person_name: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  Active: 'bg-green-50 text-green-700 border-green-200',
  Closed: 'bg-gray-100 text-gray-700 border-gray-300',
  'Over Budget': 'bg-red-50 text-red-700 border-red-200',
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default function BudgetsPage() {
  const router = useRouter();
  const [budgets, setBudgets] = useState<Budget[]>([]);
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

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[24px] font-semibold text-[#111827]">Budgets</h1>
          <p className="text-[14px] text-[#667085] mt-1">Track financial plans, variances, and department allocations</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => router.push('/reports/budget-report')}
            className="text-[13px]"
          >
            View Variance Report
          </Button>
          <Button onClick={() => router.push('/budgets/new')} className="flex items-center gap-2">
            <PlusIcon size={16} />
            <span>New Budget</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-gray-100 rounded-enterprise animate-pulse border border-[#E5E7EB]" />
          ))
        ) : budgets.length === 0 ? (
          <div className="col-span-3 bg-white border border-[#E5E7EB] rounded-enterprise p-12 text-center">
            <p className="text-[15px] font-medium text-[#111827]">No budgets created yet</p>
            <p className="text-[13px] text-[#667085] mt-1">Set up departmental and project budgets to monitor expenditure</p>
            <Button onClick={() => router.push('/budgets/new')} className="mt-4">
              Create Budget
            </Button>
          </div>
        ) : (
          budgets.map((b) => {
            const planned = parseFloat(String(b.planned_amount)) || 1;
            const achieved = parseFloat(String(b.achieved_amount)) || 0;
            const pct = Math.min(Math.round((achieved / planned) * 100), 100);

            return (
              <div
                key={b.id}
                onClick={() => router.push(`/budgets/${b.id}`)}
                className="bg-white border border-[#E5E7EB] hover:border-[#2563EB]/40 rounded-enterprise p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-[16px] font-semibold text-[#111827]">{b.budget_name}</h3>
                    <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full border ${STATUS_COLORS[b.status] || 'bg-gray-100 text-gray-700'}`}>
                      {b.status}
                    </span>
                  </div>
                  <p className="text-[12px] text-[#667085]">
                    {b.analytic_account_name ? `Cost Center: ${b.analytic_account_name}` : 'General Allocation'}
                  </p>
                  <p className="text-[12px] text-[#667085] mt-1">
                    Period: {new Date(b.period_start).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })} - {new Date(b.period_end).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                  </p>
                </div>

                <div className="mt-4 pt-4 border-t border-[#F3F4F6]">
                  <div className="flex justify-between text-[13px] mb-1.5">
                    <span className="text-[#667085]">Spent: <span className="font-mono text-[#111827] font-semibold">{formatCurrency(achieved)}</span></span>
                    <span className="text-[#667085]">Plan: <span className="font-mono text-[#111827] font-semibold">{formatCurrency(planned)}</span></span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${pct > 90 ? 'bg-red-500' : pct > 75 ? 'bg-amber-500' : 'bg-[#2563EB]'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-[#667085] mt-1">
                    <span>{pct}% utilized</span>
                    <span>Remaining: {formatCurrency(Math.max(0, planned - achieved))}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
