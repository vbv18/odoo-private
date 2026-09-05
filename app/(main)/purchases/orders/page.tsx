'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { PlusIcon } from '@/components/icons';

interface PurchaseOrder {
  id: string;
  po_number: string;
  po_date: string;
  expected_delivery_date: string | null;
  status: 'Draft' | 'Confirmed' | 'Received' | 'Cancelled';
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes: string | null;
  created_at: string;
  vendor_id: string;
  vendor_name: string;
  vendor_email: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-700 border-gray-300',
  Confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
  Received: 'bg-green-50 text-green-700 border-green-200',
  Cancelled: 'bg-red-50 text-red-700 border-red-200',
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchOrders(token);
  }, [router]);

  const fetchOrders = async (token: string) => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/purchase-orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error('Error fetching purchase orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      (order.po_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.vendor_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[24px] font-semibold text-[#111827]">Purchase Orders</h1>
          <p className="text-[14px] text-[#667085] mt-1">Manage vendor procurement, items, and billing workflow</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => router.push('/purchases/bills')}
            className="text-[13px]"
          >
            View Vendor Bills
          </Button>
          <Button
            onClick={() => router.push('/purchases/orders/new')}
            className="flex items-center gap-2"
          >
            <PlusIcon size={16} />
            <span>New Purchase Order</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by PO number or vendor..."
          className="w-full sm:w-80 px-3 py-2 text-[13px] border border-[#E5E7EB] rounded-enterprise focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
        />

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {['All', 'Draft', 'Confirmed', 'Received', 'Cancelled'].map((status) => (
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

      {/* Orders Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-enterprise overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-8 space-y-3 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-enterprise" />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-[15px] font-medium text-[#111827]">No purchase orders found</p>
            <p className="text-[13px] text-[#667085] mt-1">Create a purchase order to start procuring goods from vendors</p>
            <Button
              onClick={() => router.push('/purchases/orders/new')}
              className="mt-4"
            >
              Create Purchase Order
            </Button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F7F8FA]">
                <th className="text-left py-3 px-4 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">PO Number</th>
                <th className="text-left py-3 px-4 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">Vendor</th>
                <th className="text-left py-3 px-4 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">Order Date</th>
                <th className="text-left py-3 px-4 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">Expected Date</th>
                <th className="text-right py-3 px-4 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">Total Amount</th>
                <th className="text-center py-3 px-4 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">Status</th>
                <th className="text-right py-3 px-4 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr
                  key={order.id}
                  onClick={() => router.push(`/purchases/orders/${order.id}`)}
                  className="border-b border-[#F3F4F6] hover:bg-[#F7F8FA] cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4 font-mono text-[13px] font-semibold text-[#2563EB]">
                    {order.po_number}
                  </td>
                  <td className="py-3 px-4 text-[13px] font-medium text-[#111827]">
                    {order.vendor_name || '—'}
                  </td>
                  <td className="py-3 px-4 text-[13px] text-[#667085]">
                    {order.po_date ? new Date(order.po_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="py-3 px-4 text-[13px] text-[#667085]">
                    {order.expected_delivery_date ? new Date(order.expected_delivery_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-[13px] font-semibold text-[#111827]">
                    {formatCurrency(parseFloat(String(order.total_amount)) || 0)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-block px-2.5 py-0.5 text-[11px] font-semibold rounded-full border ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/purchases/orders/${order.id}`);
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
