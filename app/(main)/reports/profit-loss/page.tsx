'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

interface AccountRow {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  current_balance: number;
}

interface ProfitLossData {
  period: { from: string; to: string };
  income: AccountRow[];
  expenses: AccountRow[];
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: string;
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default function ProfitAndLossPage() {
  const router = useRouter();
  const [data, setData] = useState<ProfitLossData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fromDate, setFromDate] = useState('2026-01-01');
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchReport(token, fromDate, toDate);
  }, [router]);

  const fetchReport = async (token: string, from?: string, to?: string) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const queryStr = params.toString() ? `?${params.toString()}` : '';

      const res = await fetch(`/api/reports/profit-loss${queryStr}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyFilter = () => {
    const token = localStorage.getItem('token');
    if (token) fetchReport(token, fromDate, toDate);
  };

  if (isLoading && !data) {
    return (
      <div className="max-w-[1000px] mx-auto px-4 py-8 animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4" />
        <div className="h-64 bg-gray-200 rounded" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[24px] font-semibold text-[#111827]">Profit & Loss Statement</h1>
          <p className="text-[14px] text-[#667085] mt-1">
            Operating Performance ({new Date(data.period.from).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })} - {new Date(data.period.to).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })})
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => window.print()} className="text-[12px]">
            Print Statement
          </Button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 text-[13px]">
          <div className="flex items-center gap-2">
            <span className="text-[#667085] font-medium">From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border border-[#D1D5DB] rounded-md px-2.5 py-1.5 text-[13px] text-[#111827] focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#667085] font-medium">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border border-[#D1D5DB] rounded-md px-2.5 py-1.5 text-[13px] text-[#111827] focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <Button
            variant="secondary"
            onClick={handleApplyFilter}
            disabled={isLoading}
            className="text-[12px] py-1.5"
          >
            {isLoading ? 'Updating...' : 'Filter'}
          </Button>
        </div>
        <div className="text-[12px] text-[#667085]">
          Accrual Accounting (All Posted Entries)
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-5">
          <span className="text-[12px] text-[#667085]">Total Revenue</span>
          <p className="text-[22px] font-semibold text-[#16A34A] mt-1">{formatCurrency(data.totalIncome)}</p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-5">
          <span className="text-[12px] text-[#667085]">Total Operating Expenses</span>
          <p className="text-[22px] font-semibold text-[#DC2626] mt-1">{formatCurrency(data.totalExpenses)}</p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-5">
          <span className="text-[12px] text-[#667085]">Net Profit (Margin: {data.profitMargin}%)</span>
          <p className={`text-[22px] font-semibold mt-1 ${data.netProfit >= 0 ? 'text-[#2563EB]' : 'text-amber-600'}`}>
            {formatCurrency(data.netProfit)}
          </p>
        </div>
      </div>

      {/* P&L Statement Details */}
      <div className="bg-white border border-[#E5E7EB] rounded-enterprise overflow-hidden shadow-xs">
        {/* Income Section */}
        <div className="p-6 border-b border-[#E5E7EB]">
          <h2 className="text-[15px] font-bold text-[#111827] uppercase tracking-wide mb-4">1. Operating Revenue & Income</h2>
          <div className="space-y-2.5">
            {data.income.length === 0 ? (
              <p className="text-[13px] text-[#667085] italic">No income entries recorded.</p>
            ) : (
              data.income.map((acc) => (
                <div key={acc.id} className="flex items-center justify-between text-[13px] py-1 border-b border-[#F3F4F6]">
                  <div>
                    <span className="font-mono text-[#667085] mr-2 text-[12px]">{acc.account_code}</span>
                    <span className="text-[#111827] font-medium">{acc.account_name}</span>
                  </div>
                  <span className="font-mono font-semibold text-[#16A34A]">
                    {formatCurrency(parseFloat(String(acc.current_balance)) || 0)}
                  </span>
                </div>
              ))
            )}
            <div className="pt-3 flex items-center justify-between font-semibold text-[14px] text-[#111827]">
              <span>Total Revenue:</span>
              <span className="font-mono text-[#16A34A]">{formatCurrency(data.totalIncome)}</span>
            </div>
          </div>
        </div>

        {/* Expenses Section */}
        <div className="p-6 border-b border-[#E5E7EB]">
          <h2 className="text-[15px] font-bold text-[#111827] uppercase tracking-wide mb-4">2. Cost of Goods & Operating Expenses</h2>
          <div className="space-y-2.5">
            {data.expenses.length === 0 ? (
              <p className="text-[13px] text-[#667085] italic">No expense entries recorded.</p>
            ) : (
              data.expenses.map((acc) => (
                <div key={acc.id} className="flex items-center justify-between text-[13px] py-1 border-b border-[#F3F4F6]">
                  <div>
                    <span className="font-mono text-[#667085] mr-2 text-[12px]">{acc.account_code}</span>
                    <span className="text-[#111827] font-medium">{acc.account_name}</span>
                  </div>
                  <span className="font-mono font-semibold text-[#DC2626]">
                    {formatCurrency(parseFloat(String(acc.current_balance)) || 0)}
                  </span>
                </div>
              ))
            )}
            <div className="pt-3 flex items-center justify-between font-semibold text-[14px] text-[#111827]">
              <span>Total Operating Expenses:</span>
              <span className="font-mono text-[#DC2626]">{formatCurrency(data.totalExpenses)}</span>
            </div>
          </div>
        </div>

        {/* Net Profit Summary */}
        <div className="p-6 bg-[#F7F8FA] flex items-center justify-between">
          <div>
            <span className="text-[16px] font-bold text-[#111827]">NET PROFIT / (LOSS)</span>
            <p className="text-[12px] text-[#667085]">Income minus Expenses</p>
          </div>
          <span className={`text-[24px] font-bold font-mono ${data.netProfit >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
            {formatCurrency(data.netProfit)}
          </span>
        </div>
      </div>
    </div>
  );
}
