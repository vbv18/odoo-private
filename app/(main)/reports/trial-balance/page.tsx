'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

interface TrialBalanceAccount {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  opening_balance: number;
  current_balance: number;
  debit: number;
  credit: number;
}

interface TrialBalanceData {
  accounts: TrialBalanceAccount[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default function TrialBalancePage() {
  const router = useRouter();
  const [data, setData] = useState<TrialBalanceData | null>(null);
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
      const res = await fetch('/api/reports/trial-balance', {
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
      <div className="max-w-[1200px] mx-auto px-4 py-8 animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4" />
        <div className="h-64 bg-gray-200 rounded" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[24px] font-semibold text-[#111827]">Trial Balance</h1>
          <p className="text-[14px] text-[#667085] mt-1">Verification of total debit and credit equality across all ledger accounts</p>
        </div>
        <Button variant="secondary" onClick={() => window.print()} className="text-[12px]">
          Print Trial Balance
        </Button>
      </div>

      {/* Balanced Badge */}
      <div className={`p-4 rounded-enterprise mb-6 border flex items-center justify-between ${
        data.isBalanced ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
      }`}>
        <div className="flex items-center gap-2 font-medium text-[14px]">
          <span>{data.isBalanced ? '✓ Books in Balance:' : '⚠ Out of Balance:'}</span>
          <span className="font-semibold">Sum of All Debits = Sum of All Credits</span>
        </div>
        <span className="font-mono font-bold text-[15px]">
          {formatCurrency(data.totalDebit)} = {formatCurrency(data.totalCredit)}
        </span>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-enterprise overflow-hidden shadow-xs">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#E5E7EB] bg-[#F7F8FA] text-[11px] font-semibold text-[#667085] uppercase tracking-wide">
              <th className="text-left py-3 px-4">Code</th>
              <th className="text-left py-3 px-4">Account Name</th>
              <th className="text-left py-3 px-4">Type</th>
              <th className="text-right py-3 px-4">Debit Total (₹)</th>
              <th className="text-right py-3 px-4">Credit Total (₹)</th>
              <th className="text-right py-3 px-4">Current Balance (₹)</th>
            </tr>
          </thead>
          <tbody>
            {data.accounts.map((acc) => (
              <tr key={acc.id} className="border-b border-[#F3F4F6] text-[13px] hover:bg-[#F7F8FA]">
                <td className="py-2.5 px-4 font-mono text-[#667085]">{acc.account_code}</td>
                <td className="py-2.5 px-4 font-medium text-[#111827]">{acc.account_name}</td>
                <td className="py-2.5 px-4 text-[#667085] text-[12px]">{acc.account_type}</td>
                <td className="py-2.5 px-4 text-right font-mono text-[#16A34A]">
                  {acc.debit > 0 ? formatCurrency(acc.debit) : '—'}
                </td>
                <td className="py-2.5 px-4 text-right font-mono text-[#DC2626]">
                  {acc.credit > 0 ? formatCurrency(acc.credit) : '—'}
                </td>
                <td className="py-2.5 px-4 text-right font-mono font-semibold text-[#111827]">
                  {formatCurrency(parseFloat(String(acc.current_balance)) || 0)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[#111827] bg-[#F7F8FA] text-[14px] font-bold text-[#111827]">
              <td colSpan={3} className="py-3 px-4 uppercase tracking-wide">Grand Total:</td>
              <td className="py-3 px-4 text-right font-mono text-[#16A34A]">{formatCurrency(data.totalDebit)}</td>
              <td className="py-3 px-4 text-right font-mono text-[#DC2626]">{formatCurrency(data.totalCredit)}</td>
              <td className="py-3 px-4 text-right font-mono"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
