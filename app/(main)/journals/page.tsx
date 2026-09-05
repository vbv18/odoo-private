'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { PlusIcon } from '@/components/icons';

interface Journal {
  id: string;
  journal_name: string;
  journal_type: 'Sales' | 'Purchase' | 'Bank' | 'Cash' | 'General';
  description: string | null;
  default_debit_account_id: string | null;
  default_credit_account_id: string | null;
  debit_account_name: string | null;
  debit_account_code: string | null;
  credit_account_name: string | null;
  credit_account_code: string | null;
}

const TYPE_COLORS: Record<string, string> = {
  Sales: 'bg-green-50 text-green-700 border-green-200',
  Purchase: 'bg-orange-50 text-orange-700 border-orange-200',
  Bank: 'bg-blue-50 text-blue-700 border-blue-200',
  Cash: 'bg-purple-50 text-purple-700 border-purple-200',
  General: 'bg-gray-50 text-gray-700 border-gray-200',
};

export default function JournalsPage() {
  const router = useRouter();
  const [journals, setJournals] = useState<Journal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('All');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchJournals(token);
  }, [router]);

  const fetchJournals = async (token: string) => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/journals', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setJournals(data.journals || []);
      }
    } catch (err) {
      console.error('Error fetching journals:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredJournals = selectedType === 'All'
    ? journals
    : journals.filter((j) => j.journal_type === selectedType);

  const types = ['All', 'Sales', 'Purchase', 'Bank', 'Cash', 'General'];

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[24px] font-semibold text-[#111827]">Journals</h1>
          <p className="text-[14px] text-[#667085] mt-1">Configure transaction ledgers and posting defaults</p>
        </div>
        <Button onClick={() => router.push('/journals/new')} className="flex items-center gap-2">
          <PlusIcon size={16} />
          <span>New Journal</span>
        </Button>
      </div>

      {/* Type Filter Pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {types.map((type) => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            className={`px-3.5 py-1.5 rounded-enterprise text-[13px] font-medium transition-colors ${
              selectedType === type
                ? 'bg-[#2563EB] text-white shadow-xs'
                : 'bg-white text-[#667085] border border-[#E5E7EB] hover:bg-[#F7F8FA]'
            }`}
          >
            {type}
            <span className="ml-1.5 text-[11px] opacity-80">
              ({type === 'All' ? journals.length : journals.filter((j) => j.journal_type === type).length})
            </span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 bg-gray-100 rounded-enterprise animate-pulse border border-[#E5E7EB]" />
          ))}
        </div>
      ) : filteredJournals.length === 0 ? (
        <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-12 text-center">
          <p className="text-[15px] font-medium text-[#111827]">No journals found</p>
          <p className="text-[13px] text-[#667085] mt-1">Create your first journal to start recording transactions</p>
          <Button onClick={() => router.push('/journals/new')} className="mt-4">
            Create Journal
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredJournals.map((journal) => (
            <div
              key={journal.id}
              onClick={() => router.push(`/journals/${journal.id}`)}
              className="bg-white border border-[#E5E7EB] hover:border-[#2563EB]/40 rounded-enterprise p-5 transition-all shadow-xs hover:shadow-md cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="text-[16px] font-semibold text-[#111827] group-hover:text-[#2563EB]">
                    {journal.journal_name}
                  </h3>
                  <span className={`inline-block px-2.5 py-0.5 text-[11px] font-semibold rounded-full border ${TYPE_COLORS[journal.journal_type] || 'bg-gray-100 text-gray-700'}`}>
                    {journal.journal_type}
                  </span>
                </div>
                {journal.description && (
                  <p className="text-[13px] text-[#667085] line-clamp-2 mb-4">{journal.description}</p>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-[#F3F4F6] space-y-2">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-[#667085]">Default Debit:</span>
                  <span className="font-mono text-[#111827]">
                    {journal.debit_account_code ? `${journal.debit_account_code} - ${journal.debit_account_name}` : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-[#667085]">Default Credit:</span>
                  <span className="font-mono text-[#111827]">
                    {journal.credit_account_code ? `${journal.credit_account_code} - ${journal.credit_account_name}` : '—'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
