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

interface BalanceSheetData {
  as_of: string;
  assets: AccountRow[];
  liabilities: AccountRow[];
  equity: AccountRow[];
  currentYearEarnings: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default function BalanceSheetPage() {
  const router = useRouter();
  const [data, setData] = useState<BalanceSheetData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchReport(token);
  }, [router]);

  const fetchReport = async (token: string) => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/reports/balance-sheet', {
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

  if (isLoading) {
    return (
      <div className="max-w-[1100px] mx-auto px-4 py-8 animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4" />
        <div className="h-64 bg-gray-200 rounded" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[24px] font-semibold text-[#111827]">Balance Sheet</h1>
          <p className="text-[14px] text-[#667085] mt-1">
            Financial Position as of {new Date(data.as_of).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => window.print()} className="text-[12px]">
            Print Statement
          </Button>
        </div>
      </div>

      {/* Balance Indicator Banner */}
      <div className={`p-4 rounded-enterprise mb-6 border flex items-center justify-between ${
        data.isBalanced ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
      }`}>
        <div className="flex items-center gap-2 font-medium text-[14px]">
          <span>{data.isBalanced ? '✓ Statement is Balanced:' : '⚠ Out of Balance:'}</span>
          <span className="font-semibold">Assets = Liabilities + Equity</span>
        </div>
        <span className="font-mono font-bold text-[15px]">
          {formatCurrency(data.totalAssets)} = {formatCurrency(data.totalLiabilitiesAndEquity)}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ASSETS COLUMN */}
        <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="border-b border-[#E5E7EB] pb-3 mb-4 flex items-center justify-between">
              <h2 className="text-[16px] font-bold text-[#111827] uppercase tracking-wide">Assets</h2>
              <span className="text-[12px] text-[#667085]">Debit Balance</span>
            </div>

            <div className="space-y-3">
              {data.assets.length === 0 ? (
                <p className="text-[13px] text-[#667085] italic">No asset accounts recorded.</p>
              ) : (
                data.assets.map((acc) => (
                  <div key={acc.id} className="flex items-center justify-between text-[13px] py-1 border-b border-[#F3F4F6]">
                    <div>
                      <span className="font-mono text-[#667085] mr-2 text-[12px]">{acc.account_code}</span>
                      <span className="text-[#111827] font-medium">{acc.account_name}</span>
                    </div>
                    <span className="font-mono font-semibold text-[#111827]">
                      {formatCurrency(parseFloat(String(acc.current_balance)) || 0)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 mt-6 border-t-2 border-[#111827] flex items-center justify-between">
            <span className="text-[15px] font-bold text-[#111827]">TOTAL ASSETS</span>
            <span className="text-[18px] font-bold font-mono text-[#2563EB]">
              {formatCurrency(data.totalAssets)}
            </span>
          </div>
        </div>

        {/* LIABILITIES & EQUITY COLUMN */}
        <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-6 shadow-xs flex flex-col justify-between">
          <div className="space-y-6">
            {/* Liabilities */}
            <div>
              <div className="border-b border-[#E5E7EB] pb-3 mb-4 flex items-center justify-between">
                <h2 className="text-[16px] font-bold text-[#111827] uppercase tracking-wide">Liabilities</h2>
                <span className="text-[12px] text-[#667085]">Credit Balance</span>
              </div>

              <div className="space-y-3">
                {data.liabilities.length === 0 ? (
                  <p className="text-[13px] text-[#667085] italic">No liabilities recorded.</p>
                ) : (
                  data.liabilities.map((acc) => (
                    <div key={acc.id} className="flex items-center justify-between text-[13px] py-1 border-b border-[#F3F4F6]">
                      <div>
                        <span className="font-mono text-[#667085] mr-2 text-[12px]">{acc.account_code}</span>
                        <span className="text-[#111827] font-medium">{acc.account_name}</span>
                      </div>
                      <span className="font-mono font-semibold text-[#111827]">
                        {formatCurrency(parseFloat(String(acc.current_balance)) || 0)}
                      </span>
                    </div>
                  ))
                )}
                <div className="pt-2 flex items-center justify-between text-[13px] font-semibold text-[#667085]">
                  <span>Total Liabilities:</span>
                  <span className="font-mono text-[#111827]">{formatCurrency(data.totalLiabilities)}</span>
                </div>
              </div>
            </div>

            {/* Equity */}
            <div>
              <div className="border-b border-[#E5E7EB] pb-3 mb-4 flex items-center justify-between">
                <h2 className="text-[16px] font-bold text-[#111827] uppercase tracking-wide">Equity & Capital</h2>
                <span className="text-[12px] text-[#667085]">Credit Balance</span>
              </div>

              <div className="space-y-3">
                {data.equity.map((acc) => (
                  <div key={acc.id} className="flex items-center justify-between text-[13px] py-1 border-b border-[#F3F4F6]">
                    <div>
                      <span className="font-mono text-[#667085] mr-2 text-[12px]">{acc.account_code}</span>
                      <span className="text-[#111827] font-medium">{acc.account_name}</span>
                    </div>
                    <span className="font-mono font-semibold text-[#111827]">
                      {formatCurrency(parseFloat(String(acc.current_balance)) || 0)}
                    </span>
                  </div>
                ))}
                {/* Current Year Earnings / Net Profit */}
                <div className="flex items-center justify-between text-[13px] py-1 border-b border-[#F3F4F6] text-[#2563EB]">
                  <div>
                    <span className="font-mono text-[#667085] mr-2 text-[12px]">P&L</span>
                    <span className="font-medium">Retained Earnings (Current Year P&L)</span>
                  </div>
                  <span className="font-mono font-semibold">
                    {formatCurrency(data.currentYearEarnings)}
                  </span>
                </div>
                <div className="pt-2 flex items-center justify-between text-[13px] font-semibold text-[#667085]">
                  <span>Total Equity:</span>
                  <span className="font-mono text-[#111827]">{formatCurrency(data.totalEquity)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-6 border-t-2 border-[#111827] flex items-center justify-between">
            <span className="text-[15px] font-bold text-[#111827]">TOTAL LIABILITIES & EQUITY</span>
            <span className="text-[18px] font-bold font-mono text-[#2563EB]">
              {formatCurrency(data.totalLiabilitiesAndEquity)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
