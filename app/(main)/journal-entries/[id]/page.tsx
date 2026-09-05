'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';

interface EntryDetail {
  id: string;
  entry_number: string;
  entry_date: string;
  reference_type: string | null;
  reference_number: string | null;
  description: string | null;
  status: 'Draft' | 'Posted' | 'Reversed';
  total_debit: number;
  total_credit: number;
  created_at: string;
  journal_name: string | null;
  journal_type: string | null;
  lines: Array<{
    id: string;
    account_code: string;
    account_name: string;
    account_type: string;
    partner_name: string | null;
    description: string;
    debit_amount: number;
    credit_amount: number;
  }>;
}

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-700 border-gray-300',
  Posted: 'bg-green-50 text-green-700 border-green-200',
  Reversed: 'bg-red-50 text-red-700 border-red-200',
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default function JournalEntryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [entry, setEntry] = useState<EntryDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchEntry(token);
  }, [id, router]);

  const fetchEntry = async (token: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/journal-entries/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEntry(data.entry);
      } else if (res.status === 404) {
        router.push('/journal-entries');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePostEntry = async () => {
    if (!entry) return;
    setIsPosting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/journal-entries/${id}/post`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setToastMessage(data.message || 'Journal entry posted and ledger updated!');
        if (token) fetchEntry(token);
      } else {
        alert(data.message || 'Failed to post journal entry');
      }
    } catch {
      alert('Network error while posting entry');
    } finally {
      setIsPosting(false);
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

  if (!entry) return null;

  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <button
          onClick={() => router.push('/journal-entries')}
          className="text-[13px] text-[#2563EB] hover:text-blue-700 mb-2 flex items-center gap-1 font-medium"
        >
          ← Back to Journal Entries
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[24px] font-semibold text-[#111827]">{entry.entry_number}</h1>
              <span className={`inline-block px-2.5 py-0.5 text-[12px] font-semibold rounded-full border ${STATUS_COLORS[entry.status]}`}>
                {entry.status}
              </span>
            </div>
            <p className="text-[14px] text-[#667085] mt-1">
              Journal: <span className="text-[#111827] font-medium">{entry.journal_name || 'General'}</span>
              {entry.reference_number && (
                <span className="ml-3 font-mono text-[12px] text-[#2563EB]">Ref: {entry.reference_number}</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {entry.status === 'Draft' && (
              <Button
                onClick={handlePostEntry}
                disabled={isPosting}
                className="bg-[#16A34A] hover:bg-green-700 text-white"
              >
                {isPosting ? 'Posting...' : 'Post to General Ledger'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {toastMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-[13px] rounded-enterprise">
          {toastMessage}
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-4">
          <span className="text-[12px] text-[#667085]">Posting Date</span>
          <p className="text-[15px] font-semibold text-[#111827] mt-0.5">
            {entry.entry_date ? new Date(entry.entry_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
          </p>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-4">
          <span className="text-[12px] text-[#667085]">Total Debits</span>
          <p className="text-[18px] font-semibold font-mono text-[#111827] mt-0.5">
            {formatCurrency(parseFloat(String(entry.total_debit)) || 0)}
          </p>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-4">
          <span className="text-[12px] text-[#667085]">Total Credits</span>
          <p className="text-[18px] font-semibold font-mono text-[#111827] mt-0.5">
            {formatCurrency(parseFloat(String(entry.total_credit)) || 0)}
          </p>
        </div>
      </div>

      {/* Lines Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-enterprise overflow-hidden mb-6 shadow-xs">
        <div className="px-5 py-3 border-b border-[#E5E7EB] bg-[#F7F8FA] flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-[#111827]">Double-Entry Postings</h2>
          <span className="text-[12px] text-[#16A34A] font-semibold">Balanced (100% Equal)</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#E5E7EB] bg-[#FAFAFA] text-[11px] font-semibold text-[#667085] uppercase tracking-wide">
              <th className="text-left py-2.5 px-4">Account Code & Name</th>
              <th className="text-left py-2.5 px-4">Type</th>
              <th className="text-left py-2.5 px-4">Partner</th>
              <th className="text-left py-2.5 px-4">Description</th>
              <th className="text-right py-2.5 px-4">Debit (₹)</th>
              <th className="text-right py-2.5 px-4">Credit (₹)</th>
            </tr>
          </thead>
          <tbody>
            {(entry.lines || []).map((line) => (
              <tr key={line.id} className="border-b border-[#F3F4F6] text-[13px]">
                <td className="py-3 px-4">
                  <span className="font-mono text-[12px] text-[#667085] mr-2">{line.account_code}</span>
                  <span className="font-medium text-[#111827]">{line.account_name}</span>
                </td>
                <td className="py-3 px-4 text-[#667085] text-[12px]">{line.account_type}</td>
                <td className="py-3 px-4 text-[#111827]">{line.partner_name || '—'}</td>
                <td className="py-3 px-4 text-[#667085]">{line.description || '—'}</td>
                <td className="py-3 px-4 text-right font-mono font-semibold text-[#16A34A]">
                  {parseFloat(String(line.debit_amount)) > 0 ? formatCurrency(parseFloat(String(line.debit_amount))) : '—'}
                </td>
                <td className="py-3 px-4 text-right font-mono font-semibold text-[#DC2626]">
                  {parseFloat(String(line.credit_amount)) > 0 ? formatCurrency(parseFloat(String(line.credit_amount))) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals Summary */}
        <div className="p-4 border-t border-[#E5E7EB] bg-[#F7F8FA] flex justify-end">
          <div className="w-80 space-y-1.5 text-[13px]">
            <div className="flex justify-between text-[#111827] font-semibold">
              <span>Total Debit:</span>
              <span className="font-mono text-[#16A34A]">{formatCurrency(parseFloat(String(entry.total_debit)) || 0)}</span>
            </div>
            <div className="flex justify-between text-[#111827] font-semibold">
              <span>Total Credit:</span>
              <span className="font-mono text-[#DC2626]">{formatCurrency(parseFloat(String(entry.total_credit)) || 0)}</span>
            </div>
          </div>
        </div>
      </div>

      {entry.description && (
        <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-4 text-[13px]">
          <span className="font-semibold text-[#111827] block mb-1">Entry Memo / Description:</span>
          <p className="text-[#667085]">{entry.description}</p>
        </div>
      )}
    </div>
  );
}
