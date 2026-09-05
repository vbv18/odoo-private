'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

interface LedgerItem {
  id: string;
  debit_amount: number;
  credit_amount: number;
  line_description: string;
  entry_number: string;
  entry_date: string;
  entry_description: string;
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  partner_name: string | null;
}

interface Account {
  id: string;
  account_code: string;
  account_name: string;
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default function GeneralLedgerPage() {
  const router = useRouter();
  const [items, setItems] = useState<LedgerItem[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchAccounts(token);
    fetchLedger(token);
  }, [router]);

  const fetchAccounts = async (token: string) => {
    try {
      const res = await fetch('/api/chart-of-accounts', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
      }
    } catch {}
  };

  const fetchLedger = async (token?: string, accId?: string, from?: string, to?: string) => {
    try {
      setIsLoading(true);
      const t = token || localStorage.getItem('token');
      let url = '/api/reports/ledger?';
      if (accId) url += `account_id=${accId}&`;
      if (from) url += `from=${from}&`;
      if (to) url += `to=${to}&`;

      const res = await fetch(url, { headers: { Authorization: `Bearer ${t}` } });
      if (res.ok) {
        const data = await res.json();
        setItems(data.entries || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilter = () => {
    fetchLedger(undefined, selectedAccountId, fromDate, toDate);
  };

  const handleClear = () => {
    setSelectedAccountId('');
    setFromDate('');
    setToDate('');
    fetchLedger(undefined, '', '', '');
  };

  const totalDebits = items.reduce((sum, item) => sum + (parseFloat(String(item.debit_amount)) || 0), 0);
  const totalCredits = items.reduce((sum, item) => sum + (parseFloat(String(item.credit_amount)) || 0), 0);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[24px] font-semibold text-[#111827]">General Ledger</h1>
          <p className="text-[14px] text-[#667085] mt-1">Full chronological journal book and transaction activity by account</p>
        </div>
        <Button variant="secondary" onClick={() => window.print()} className="text-[12px]">
          Print Ledger
        </Button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div className="w-64">
          <label className="block text-[12px] font-medium text-[#111827] mb-1">Filter by Account</label>
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="w-full px-3 py-2 text-[13px] border border-[#E5E7EB] rounded-enterprise focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          >
            <option value="">All Accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.account_code} - {a.account_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[12px] font-medium text-[#111827] mb-1">From Date</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-3 py-2 text-[13px] border border-[#E5E7EB] rounded-enterprise focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          />
        </div>

        <div>
          <label className="block text-[12px] font-medium text-[#111827] mb-1">To Date</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-3 py-2 text-[13px] border border-[#E5E7EB] rounded-enterprise focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          />
        </div>

        <Button onClick={handleFilter} className="text-[13px]">
          Apply Filter
        </Button>
        <button
          onClick={handleClear}
          className="px-3 py-2 text-[13px] text-[#667085] hover:text-[#111827]"
        >
          Reset
        </button>
      </div>

      {/* Ledger Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-enterprise overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-8 space-y-3 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-enterprise" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-[#667085] text-[14px]">
            No posted journal entries match the filter criteria.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F7F8FA] text-[11px] font-semibold text-[#667085] uppercase tracking-wide">
                <th className="text-left py-3 px-4">Date</th>
                <th className="text-left py-3 px-4">Entry #</th>
                <th className="text-left py-3 px-4">Account</th>
                <th className="text-left py-3 px-4">Partner</th>
                <th className="text-left py-3 px-4">Description</th>
                <th className="text-right py-3 px-4">Debit (₹)</th>
                <th className="text-right py-3 px-4">Credit (₹)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-[#F3F4F6] text-[13px] hover:bg-[#F7F8FA]">
                  <td className="py-2.5 px-4 text-[#667085]">
                    {item.entry_date ? new Date(item.entry_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="py-2.5 px-4 font-mono font-medium text-[#2563EB]">{item.entry_number}</td>
                  <td className="py-2.5 px-4">
                    <span className="font-mono text-[12px] text-[#667085] mr-1.5">{item.account_code}</span>
                    <span className="font-medium text-[#111827]">{item.account_name}</span>
                  </td>
                  <td className="py-2.5 px-4 text-[#111827]">{item.partner_name || '—'}</td>
                  <td className="py-2.5 px-4 text-[#667085]">{item.line_description || item.entry_description || '—'}</td>
                  <td className="py-2.5 px-4 text-right font-mono font-semibold text-[#16A34A]">
                    {parseFloat(String(item.debit_amount)) > 0 ? formatCurrency(parseFloat(String(item.debit_amount))) : '—'}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-semibold text-[#DC2626]">
                    {parseFloat(String(item.credit_amount)) > 0 ? formatCurrency(parseFloat(String(item.credit_amount))) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#111827] bg-[#F7F8FA] font-bold text-[14px]">
                <td colSpan={5} className="py-3 px-4 uppercase tracking-wide">Total Posted Volume:</td>
                <td className="py-3 px-4 text-right font-mono text-[#16A34A]">{formatCurrency(totalDebits)}</td>
                <td className="py-3 px-4 text-right font-mono text-[#DC2626]">{formatCurrency(totalCredits)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
