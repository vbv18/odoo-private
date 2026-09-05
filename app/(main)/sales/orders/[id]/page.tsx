'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';

interface OrderDetail {
  id: string;
  so_number: string;
  customer_id: string;
  customer_name: string;
  customer_email: string | null;
  customer_mobile: string | null;
  customer_address: string | null;
  so_date: string;
  expected_delivery_date: string | null;
  status: 'Draft' | 'Confirmed' | 'Delivered' | 'Cancelled';
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes: string | null;
  created_at: string;
  items: Array<{
    id: string;
    product_id: string;
    product_name: string | null;
    sku: string | null;
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate: number;
    line_total: number;
  }>;
}

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-700 border-gray-300',
  Confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
  Delivered: 'bg-green-50 text-green-700 border-green-200',
  Cancelled: 'bg-red-50 text-red-700 border-red-200',
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default function SalesOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConverting, setIsConverting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchOrder(token);
  }, [id, router]);

  const fetchOrder = async (token: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/sales-orders/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOrder(data.order);
      } else if (res.status === 404) {
        router.push('/sales/orders');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleConvertToInvoice = async () => {
    if (!order) return;
    setIsConverting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/sales-orders/${id}/convert-to-invoice`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/sales/invoices/${data.invoice.id}`);
      } else {
        alert(data.message || 'Failed to convert to invoice');
      }
    } catch {
      alert('Network error while converting sales order');
    } finally {
      setIsConverting(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/sales-orders/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setOrder((prev) => (prev ? { ...prev, status: newStatus as any } : null));
        setToastMessage(`Sales order marked as ${newStatus}`);
      }
    } catch (err) {
      console.error(err);
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

  if (!order) return null;

  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <button
          onClick={() => router.push('/sales/orders')}
          className="text-[13px] text-[#2563EB] hover:text-blue-700 mb-2 flex items-center gap-1 font-medium"
        >
          ← Back to Sales Orders
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[24px] font-semibold text-[#111827]">{order.so_number}</h1>
              <span className={`inline-block px-2.5 py-0.5 text-[12px] font-semibold rounded-full border ${STATUS_COLORS[order.status]}`}>
                {order.status}
              </span>
            </div>
            <p className="text-[14px] text-[#667085] mt-1">
              Customer: <span className="text-[#111827] font-medium">{order.customer_name}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {order.status === 'Draft' && (
              <Button variant="secondary" onClick={() => handleUpdateStatus('Confirmed')}>
                Confirm Order
              </Button>
            )}

            {order.status !== 'Cancelled' && (
              <Button
                onClick={handleConvertToInvoice}
                disabled={isConverting}
                className="bg-[#16A34A] hover:bg-green-700 text-white"
              >
                {isConverting ? 'Creating Invoice...' : 'Convert to Invoice'}
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

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-4">
          <span className="text-[12px] text-[#667085]">Order Date</span>
          <p className="text-[15px] font-semibold text-[#111827] mt-0.5">
            {order.so_date ? new Date(order.so_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
          </p>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-4">
          <span className="text-[12px] text-[#667085]">Delivery Date</span>
          <p className="text-[15px] font-semibold text-[#111827] mt-0.5">
            {order.expected_delivery_date ? new Date(order.expected_delivery_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Immediate'}
          </p>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-4">
          <span className="text-[12px] text-[#667085]">Total Order Value</span>
          <p className="text-[20px] font-semibold text-[#2563EB] mt-0.5">
            {formatCurrency(parseFloat(String(order.total_amount)) || 0)}
          </p>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-enterprise overflow-hidden mb-6 shadow-xs">
        <div className="px-5 py-3 border-b border-[#E5E7EB] bg-[#F7F8FA]">
          <h2 className="text-[14px] font-semibold text-[#111827]">Order Items</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#E5E7EB] bg-[#FAFAFA] text-[11px] font-semibold text-[#667085] uppercase tracking-wide">
              <th className="text-left py-2.5 px-4">Item & SKU</th>
              <th className="text-left py-2.5 px-4">Description</th>
              <th className="text-right py-2.5 px-4">Qty</th>
              <th className="text-right py-2.5 px-4">Unit Price</th>
              <th className="text-right py-2.5 px-4">Tax %</th>
              <th className="text-right py-2.5 px-4">Line Total</th>
            </tr>
          </thead>
          <tbody>
            {(order.items || []).map((item) => (
              <tr key={item.id} className="border-b border-[#F3F4F6] text-[13px]">
                <td className="py-3 px-4 font-medium text-[#111827]">
                  {item.product_name || 'Item'}
                  {item.sku && <span className="block font-mono text-[11px] text-[#667085]">{item.sku}</span>}
                </td>
                <td className="py-3 px-4 text-[#667085]">{item.description || '—'}</td>
                <td className="py-3 px-4 text-right font-mono">{item.quantity}</td>
                <td className="py-3 px-4 text-right font-mono">{formatCurrency(parseFloat(String(item.unit_price)))}</td>
                <td className="py-3 px-4 text-right font-mono">{item.tax_rate}%</td>
                <td className="py-3 px-4 text-right font-mono font-semibold text-[#111827]">
                  {formatCurrency(parseFloat(String(item.quantity)) * parseFloat(String(item.unit_price)))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="p-4 border-t border-[#E5E7EB] flex justify-end">
          <div className="w-72 space-y-1.5 text-[13px]">
            <div className="flex justify-between text-[#667085]">
              <span>Subtotal:</span>
              <span className="font-mono text-[#111827]">{formatCurrency(parseFloat(String(order.subtotal)) || 0)}</span>
            </div>
            <div className="flex justify-between text-[#667085]">
              <span>Tax Amount:</span>
              <span className="font-mono text-[#111827]">{formatCurrency(parseFloat(String(order.tax_amount)) || 0)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-[#E5E7EB] text-[15px] font-semibold text-[#111827]">
              <span>Total Amount:</span>
              <span className="font-mono text-[#2563EB]">{formatCurrency(parseFloat(String(order.total_amount)) || 0)}</span>
            </div>
          </div>
        </div>
      </div>

      {order.notes && (
        <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-4 text-[13px]">
          <span className="font-semibold text-[#111827] block mb-1">Notes:</span>
          <p className="text-[#667085]">{order.notes}</p>
        </div>
      )}
    </div>
  );
}
