'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface LedgerLine {
  id: string;
  entry_number: string;
  entry_date: string;
  debit_amount: number;
  credit_amount: number;
  description: string;
  entry_description: string;
  running_balance: number;
  status: string;
}

export default function AccountLedgerPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [lines, setLines] = useState<LedgerLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [accountName, setAccountName] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    fetchAccountName(token);
    fetchLedger(token);
  }, [id]);

  const fetchAccountName = async (token: string) => {
    const res = await fetch(`/api/chart-of-accounts/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) { const d = await res.json(); setAccountName(`${d.account.account_code} - ${d.account.account_name}`); }
  };

  const fetchLedger = async (token?: string, from?: string, to?: string) => {
    try {
      setIsLoading(true);
      const t = token || localStorage.getItem('token');
      let url = `/api/chart-of-accounts/${id}/ledger?`;
      if (from) url += `from=${from}&`;
      if (to) url += `to=${to}&`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${t}` } });
      if (res.ok) { const d = await res.json(); setLines(d.ledger); }
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Math.abs(n));

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <button onClick={() => router.push(`/chart-of-accounts/${id}`)} className="text-[13px] text-[#2563EB] hover:text-blue-700 mb-2">← Back to Account</button>
        <h1 className="text-[24px] font-semibold text-[#111827]">Account Ledger</h1>
        <p className="text-[14px] text-[#667085] mt-1">{accountName}</p>
      </div>

      {/* Date Filters */}
      <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-[12px] font-medium text-[#111827] mb-1">From Date</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
            className="px-3 py-2 text-[13px] border border-[#E5E7EB] rounded-enterprise focus:outline-none focus:ring-2 focus:ring-[#2563EB]" />
        </div>
        <div>
          <label className="block text-[12px] font-medium text-[#111827] mb-1">To Date</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
            className="px-3 py-2 text-[13px] border border-[#E5E7EB] rounded-enterprise focus:outline-none focus:ring-2 focus:ring-[#2563EB]" />
        </div>
        <button
          onClick={() => fetchLedger(undefined, fromDate, toDate)}
          className="px-4 py-2 text-[13px] font-medium bg-[#2563EB] text-white rounded-enterprise hover:bg-blue-700 transition-colors"
        >
          Apply Filter
        </button>
        <button onClick={() => { setFromDate(''); setToDate(''); fetchLedger(); }} className="px-4 py-2 text-[13px] font-medium text-[#667085] hover:text-[#111827]">
          Clear
        </button>
      </div>

      {/* Ledger Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-enterprise overflow-hidden">
        {isLoading ? (
          <div className="p-8 animate-pulse space-y-3">
            {[1,2,3,4,5].map((i) => <div key={i} className="h-10 bg-gray-200 rounded" />)}
          </div>
        ) : lines.length === 0 ? (
          <div className="p-12 text-center text-[14px] text-[#667085]">
            No journal entries found for this account.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F7F8FA]">
                <th className="text-left py-3 px-4 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">Date</th>
                <th className="text-left py-3 px-4 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">Entry No.</th>
                <th className="text-left py-3 px-4 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">Description</th>
                <th className="text-right py-3 px-4 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">Debit</th>
                <th className="text-right py-3 px-4 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">Credit</th>
                <th className="text-right py-3 px-4 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">Balance</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, i) => (
                <tr key={line.id} className={`border-b border-[#F3F4F6] ${i % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}`}>
                  <td className="py-3 px-4 text-[13px] text-[#667085]">
                    {line.entry_date ? new Date(line.entry_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="py-3 px-4 text-[13px] font-mono text-[#2563EB]">{line.entry_number}</td>
                  <td className="py-3 px-4 text-[13px] text-[#111827]">{line.description || line.entry_description}</td>
                  <td className="py-3 px-4 text-right font-mono text-[13px] text-[#16A34A]">
                    {parseFloat(String(line.debit_amount)) > 0 ? fmt(parseFloat(String(line.debit_amount))) : '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-[13px] text-[#DC2626]">
                    {parseFloat(String(line.credit_amount)) > 0 ? fmt(parseFloat(String(line.credit_amount))) : '—'}
                  </td>
                  <td className={`py-3 px-4 text-right font-mono text-[13px] font-semibold ${line.running_balance >= 0 ? 'text-[#111827]' : 'text-[#DC2626]'}`}>
                    {line.running_balance < 0 ? `(${fmt(Math.abs(line.running_balance))})` : fmt(line.running_balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
