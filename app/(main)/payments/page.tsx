'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { PlusIcon } from '@/components/icons';

interface Payment {
  id: string;
  payment_number: string;
  payment_type: 'Receipt' | 'Payment';
  payment_method: 'Cash' | 'Bank' | 'Cheque' | 'UPI' | 'Card';
  payment_date: string;
  amount: number;
  reference_type: string | null;
  reference_number: string | null;
  partner_name: string | null;
  notes: string | null;
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default function PaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'All' | 'Receipt' | 'Payment'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchPayments(token);
  }, [router]);

  const fetchPayments = async (token: string) => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/payments', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments || []);
      }
    } catch (err) {
      console.error('Error fetching payments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPayments = payments.filter((p) => {
    const matchesTab = activeTab === 'All' || p.payment_type === activeTab;
    const matchesSearch =
      (p.payment_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.partner_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.reference_number || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const totalReceipts = payments
    .filter((p) => p.payment_type === 'Receipt')
    .reduce((sum, p) => sum + (parseFloat(String(p.amount)) || 0), 0);

  const totalDisbursements = payments
    .filter((p) => p.payment_type === 'Payment')
    .reduce((sum, p) => sum + (parseFloat(String(p.amount)) || 0), 0);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[24px] font-semibold text-[#111827]">Payments & Receipts</h1>
          <p className="text-[14px] text-[#667085] mt-1">Audit trail of all money inflows and vendor disbursements</p>
        </div>
        <Button onClick={() => router.push('/payments/new')} className="flex items-center gap-2">
          <PlusIcon size={16} />
          <span>Record Payment</span>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-4">
          <span className="text-[12px] text-[#667085]">Total Inflows (Receipts)</span>
          <p className="text-[22px] font-semibold text-[#16A34A] mt-1">{formatCurrency(totalReceipts)}</p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-4">
          <span className="text-[12px] text-[#667085]">Total Outflows (Payments)</span>
          <p className="text-[22px] font-semibold text-[#DC2626] mt-1">{formatCurrency(totalDisbursements)}</p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-4">
          <span className="text-[12px] text-[#667085]">Net Cash Movement</span>
          <p className={`text-[22px] font-semibold mt-1 ${totalReceipts >= totalDisbursements ? 'text-[#2563EB]' : 'text-amber-600'}`}>
            {formatCurrency(totalReceipts - totalDisbursements)}
          </p>
        </div>
      </div>

      {/* Filter and Tab Bar */}
      <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search payments by number, partner, or ref..."
          className="w-full sm:w-80 px-3 py-2 text-[13px] border border-[#E5E7EB] rounded-enterprise focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
        />

        <div className="flex items-center gap-2">
          {(['All', 'Receipt', 'Payment'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-enterprise text-[12px] font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-[#2563EB] text-white shadow-xs'
                  : 'bg-white text-[#667085] border border-[#E5E7EB] hover:bg-[#F7F8FA]'
              }`}
            >
              {tab === 'All' ? 'All Transactions' : tab === 'Receipt' ? 'Customer Receipts' : 'Vendor Payments'}
            </button>
          ))}
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-enterprise overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-8 space-y-3 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-enterprise" />
            ))}
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-[15px] font-medium text-[#111827]">No payments recorded yet</p>
            <p className="text-[13px] text-[#667085] mt-1">Payments recorded against bills or receipts against invoices will show here</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F7F8FA]">
                <th className="text-left py-3 px-4 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">Payment No.</th>
                <th className="text-left py-3 px-4 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">Type</th>
                <th className="text-left py-3 px-4 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">Partner</th>
                <th className="text-left py-3 px-4 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">Date</th>
                <th className="text-left py-3 px-4 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">Method</th>
                <th className="text-left py-3 px-4 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">Ref / Document</th>
                <th className="text-right py-3 px-4 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">Amount</th>
                <th className="text-right py-3 px-4 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">Voucher</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => router.push(`/payments/${p.id}`)}
                  className="border-b border-[#F3F4F6] hover:bg-[#F7F8FA] cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4 font-mono text-[13px] font-semibold text-[#2563EB]">
                    {p.payment_number}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded-full border ${
                      p.payment_type === 'Receipt'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {p.payment_type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[13px] font-medium text-[#111827]">
                    {p.partner_name || '—'}
                  </td>
                  <td className="py-3 px-4 text-[13px] text-[#667085]">
                    {p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="py-3 px-4 text-[13px] text-[#111827]">
                    {p.payment_method}
                  </td>
                  <td className="py-3 px-4 text-[12px] text-[#667085] font-mono">
                    {p.reference_number || (p.reference_type ? `${p.reference_type}` : '—')}
                  </td>
                  <td className={`py-3 px-4 text-right font-mono text-[13px] font-semibold ${
                    p.payment_type === 'Receipt' ? 'text-[#16A34A]' : 'text-[#DC2626]'
                  }`}>
                    {p.payment_type === 'Receipt' ? '+' : '-'}{formatCurrency(parseFloat(String(p.amount)) || 0)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/payments/${p.id}`);
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
