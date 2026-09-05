'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { PlusIcon } from '@/components/icons';

interface CustomerInvoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  status: 'Draft' | 'Posted' | 'Paid' | 'Cancelled';
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  notes: string | null;
  created_at: string;
  customer_id: string;
  customer_name: string;
  sales_order_id: string | null;
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

export default function CustomerInvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<CustomerInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchInvoices(token);
  }, [router]);

  const fetchInvoices = async (token: string) => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/customer-invoices', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices || []);
      }
    } catch (err) {
      console.error('Error fetching customer invoices:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      (inv.invoice_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.customer_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[24px] font-semibold text-[#111827]">Customer Invoices</h1>
          <p className="text-[14px] text-[#667085] mt-1">Manage accounts receivable, collection status, and customer payments</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => router.push('/sales/orders')}
            className="text-[13px]"
          >
            View Sales Orders
          </Button>
          <Button
            onClick={() => router.push('/sales/invoices/new')}
            className="flex items-center gap-2"
          >
            <PlusIcon size={16} />
            <span>New Invoice</span>
          </Button>
        </div>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by invoice number or customer..."
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

      <div className="bg-white border border-[#E5E7EB] rounded-enterprise overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-8 space-y-3 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-enterprise" />
            ))}
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-[15px] font-medium text-[#111827]">No customer invoices found</p>
            <p className="text-[13px] text-[#667085] mt-1">Generate invoices from sales orders or create one directly</p>
            <Button
              onClick={() => router.push('/sales/invoices/new')}
              className="mt-4"
            >
              Create Invoice
            </Button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F7F8FA]">
                <th className="text-left py-3 px-4 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">Invoice No.</th>
                <th className="text-left py-3 px-4 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">Customer</th>
                <th className="text-left py-3 px-4 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">Invoice Date</th>
                <th className="text-left py-3 px-4 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">Due Date</th>
                <th className="text-right py-3 px-4 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">Total</th>
                <th className="text-right py-3 px-4 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">Balance Due</th>
                <th className="text-center py-3 px-4 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">Status</th>
                <th className="text-right py-3 px-4 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((inv) => (
                <tr
                  key={inv.id}
                  onClick={() => router.push(`/sales/invoices/${inv.id}`)}
                  className="border-b border-[#F3F4F6] hover:bg-[#F7F8FA] cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4 font-mono text-[13px] font-semibold text-[#2563EB]">
                    {inv.invoice_number}
                  </td>
                  <td className="py-3 px-4 text-[13px] font-medium text-[#111827]">
                    {inv.customer_name || '—'}
                  </td>
                  <td className="py-3 px-4 text-[13px] text-[#667085]">
                    {inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="py-3 px-4 text-[13px] text-[#667085]">
                    {inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-[13px] font-semibold text-[#111827]">
                    {formatCurrency(parseFloat(String(inv.total_amount)) || 0)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-[13px] font-semibold text-[#16A34A]">
                    {formatCurrency(parseFloat(String(inv.balance_due)) || 0)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-block px-2.5 py-0.5 text-[11px] font-semibold rounded-full border ${STATUS_COLORS[inv.status] || 'bg-gray-100 text-gray-700'}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/sales/invoices/${inv.id}`);
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
