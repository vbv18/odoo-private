'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { PlusIcon } from '@/components/icons';

interface JournalEntry {
  id: string;
  entry_number: string;
  entry_date: string;
  reference_type: string | null;
  reference_number: string | null;
  description: string | null;
  status: 'Draft' | 'Posted' | 'Reversed';
  total_debit: number;
  total_credit: number;
  journal_name: string | null;
  journal_type: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-700 border-gray-300',
  Posted: 'bg-green-50 text-green-700 border-green-200',
  Reversed: 'bg-red-50 text-red-700 border-red-200',
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default function JournalEntriesPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchEntries(token);
  }, [router]);

  const fetchEntries = async (token: string) => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/journal-entries', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
      }
    } catch (err) {
      console.error('Error fetching journal entries:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEntries = entries.filter((e) => {
    const matchesSearch =
      (e.entry_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.reference_number || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[24px] font-semibold text-[#111827]">Journal Entries</h1>
          <p className="text-[14px] text-[#667085] mt-1">General ledger postings, manual adjustments, and audit trail</p>
        </div>
        <Button onClick={() => router.push('/journal-entries/new')} className="flex items-center gap-2">
          <PlusIcon size={16} />
          <span>New Journal Entry</span>
        </Button>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by entry #, description, ref..."
          className="w-full sm:w-80 px-3 py-2 text-[13px] border border-[#E5E7EB] rounded-enterprise focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
        />

        <div className="flex items-center gap-2">
          {['All', 'Draft', 'Posted', 'Reversed'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-enterprise text-[12px] font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-[#2563EB] text-white shadow-xs'
                  : 'bg-white text-[#667085] border border-[#E5E7EB] hover:bg-[#F7F8FA]'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-enterprise overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-8 space-y-3 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-enterprise" />
            ))}
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-[15px] font-medium text-[#111827]">No journal entries found</p>
            <p className="text-[13px] text-[#667085] mt-1">Manual entries and automated transaction postings appear here</p>
            <Button onClick={() => router.push('/journal-entries/new')} className="mt-4">
              Create Journal Entry
            </Button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F7F8FA]">
                <th className="text-left py-3 px-4 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">Entry No.</th>
                <th className="text-left py-3 px-4 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">Date</th>
                <th className="text-left py-3 px-4 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">Journal</th>
                <th className="text-left py-3 px-4 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">Narrative / Ref</th>
                <th className="text-right py-3 px-4 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">Debit (₹)</th>
                <th className="text-right py-3 px-4 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">Credit (₹)</th>
                <th className="text-center py-3 px-4 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">Status</th>
                <th className="text-right py-3 px-4 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((entry) => (
                <tr
                  key={entry.id}
                  onClick={() => router.push(`/journal-entries/${entry.id}`)}
                  className="border-b border-[#F3F4F6] hover:bg-[#F7F8FA] cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4 font-mono text-[13px] font-semibold text-[#2563EB]">
                    {entry.entry_number}
                  </td>
                  <td className="py-3 px-4 text-[13px] text-[#667085]">
                    {entry.entry_date ? new Date(entry.entry_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="py-3 px-4 text-[13px] text-[#111827]">
                    {entry.journal_name || 'General Journal'}
                  </td>
                  <td className="py-3 px-4 text-[13px] text-[#111827]">
                    {entry.description || entry.reference_number || '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-[13px] font-semibold text-[#111827]">
                    {formatCurrency(parseFloat(String(entry.total_debit)) || 0)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-[13px] font-semibold text-[#111827]">
                    {formatCurrency(parseFloat(String(entry.total_credit)) || 0)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-block px-2.5 py-0.5 text-[11px] font-semibold rounded-full border ${STATUS_COLORS[entry.status] || 'bg-gray-100 text-gray-700'}`}>
                      {entry.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/journal-entries/${entry.id}`);
                      }}
                      className="text-[12px] text-[#2563EB] hover:underline font-medium"
                    >
                      View
                    </button>
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
