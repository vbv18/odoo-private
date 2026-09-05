'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { PlusIcon } from '@/components/icons';

interface VendorBill {
  id: string;
  bill_number: string;
  bill_date: string;
  due_date: string;
  status: 'Draft' | 'Posted' | 'Paid' | 'Cancelled';
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  notes: string | null;
  created_at: string;
  vendor_id: string;
  vendor_name: string;
  purchase_order_id: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-700 border-gray-300',
  Posted: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  Paid: 'bg-green-50 text-green-700 border-green-200',
  Cancelled: 'bg-red-50 text-red-700 border-red-200',
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default function VendorBillsPage() {
  const router = useRouter();
  const [bills, setBills] = useState<VendorBill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchBills(token);
  }, [router]);

  const fetchBills = async (token: string) => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/vendor-bills', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBills(data.bills || []);
      }
    } catch (err) {
      console.error('Error fetching vendor bills:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredBills = bills.filter((b) => {
    const matchesSearch =
      (b.bill_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.vendor_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[24px] font-semibold text-[#111827]">Vendor Bills</h1>
          <p className="text-[14px] text-[#667085] mt-1">Manage accounts payable, bill settlements, and outgoing disbursements</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => router.push('/purchases/orders')}
            className="text-[13px]"
          >
            View Purchase Orders
          </Button>
          <Button
            onClick={() => router.push('/purchases/bills/new')}
            className="flex items-center gap-2"
          >
            <PlusIcon size={16} />
            <span>New Vendor Bill</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by bill number or vendor..."
          className="w-full sm:w-80 px-3 py-2 text-[13px] border border-[#E5E7EB] rounded-enterprise focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
        />

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {['All', 'Draft', 'Posted', 'Paid', 'Cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-enterprise text-[12px] font-medium transition-colors whitespace-nowrap ${
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

      {/* Bills Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-enterprise overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-8 space-y-3 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-enterprise" />
            ))}
          </div>
        ) : filteredBills.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-[15px] font-medium text-[#111827]">No vendor bills found</p>
            <p className="text-[13px] text-[#667085] mt-1">Bills created from purchase orders or created manually will appear here</p>
            <Button
              onClick={() => router.push('/purchases/bills/new')}
              className="mt-4"
            >
              Create Vendor Bill
            </Button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F7F8FA]">
                <th className="text-left py-3 px-4 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">Bill Number</th>
                <th className="text-left py-3 px-4 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">Vendor</th>
                <th className="text-left py-3 px-4 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">Bill Date</th>
                <th className="text-left py-3 px-4 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">Due Date</th>
                <th className="text-right py-3 px-4 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">Total</th>
                <th className="text-right py-3 px-4 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">Balance Due</th>
                <th className="text-center py-3 px-4 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">Status</th>
                <th className="text-right py-3 px-4 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredBills.map((bill) => (
                <tr
                  key={bill.id}
                  onClick={() => router.push(`/purchases/bills/${bill.id}`)}
                  className="border-b border-[#F3F4F6] hover:bg-[#F7F8FA] cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4 font-mono text-[13px] font-semibold text-[#2563EB]">
                    {bill.bill_number}
                  </td>
                  <td className="py-3 px-4 text-[13px] font-medium text-[#111827]">
                    {bill.vendor_name || '—'}
                  </td>
                  <td className="py-3 px-4 text-[13px] text-[#667085]">
                    {bill.bill_date ? new Date(bill.bill_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="py-3 px-4 text-[13px] text-[#667085]">
                    {bill.due_date ? new Date(bill.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-[13px] font-semibold text-[#111827]">
                    {formatCurrency(parseFloat(String(bill.total_amount)) || 0)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-[13px] font-semibold text-[#DC2626]">
                    {formatCurrency(parseFloat(String(bill.balance_due)) || 0)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-block px-2.5 py-0.5 text-[11px] font-semibold rounded-full border ${STATUS_COLORS[bill.status] || 'bg-gray-100 text-gray-700'}`}>
                      {bill.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/purchases/bills/${bill.id}`);
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
