'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { XIcon } from '@/components/icons';

interface BillDetail {
  id: string;
  bill_number: string;
  vendor_id: string;
  vendor_name: string;
  vendor_email: string | null;
  vendor_mobile: string | null;
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
  po_number: string | null;
  purchase_order_id: string | null;
  items: Array<{
    id: string;
    product_name: string | null;
    sku: string | null;
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate: number;
    line_total: number;
  }>;
  payments: Array<{
    id: string;
    payment_number: string;
    payment_date: string;
    payment_method: string;
    amount: number;
    notes: string | null;
  }>;
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

export default function VendorBillDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [bill, setBill] = useState<BillDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'Bank',
    notes: '',
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchBill(token);
  }, [id, router]);

  const fetchBill = async (token: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/vendor-bills/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBill(data.bill);
        setPaymentForm((prev) => ({
          ...prev,
          amount: String(data.bill.balance_due || data.bill.total_amount),
        }));
      } else if (res.status === 404) {
        router.push('/purchases/bills');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError('');
    setIsSubmittingPayment(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/vendor-bills/${id}/register-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(paymentForm),
      });
      const data = await res.json();
      if (res.ok) {
        setPaymentModalOpen(false);
        setToastMessage('Payment recorded and double-entry journal entry posted!');
        if (token) fetchBill(token);
      } else {
        setPaymentError(data.message || 'Payment registration failed');
      }
    } catch {
      setPaymentError('Network error while processing payment');
    } finally {
      setIsSubmittingPayment(false);
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

  if (!bill) return null;

  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/purchases/bills')}
          className="text-[13px] text-[#2563EB] hover:text-blue-700 mb-2 flex items-center gap-1 font-medium"
        >
          ← Back to Vendor Bills
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[24px] font-semibold text-[#111827]">{bill.bill_number}</h1>
              <span className={`inline-block px-2.5 py-0.5 text-[12px] font-semibold rounded-full border ${STATUS_COLORS[bill.status]}`}>
                {bill.status}
              </span>
            </div>
            <p className="text-[14px] text-[#667085] mt-1">
              Vendor: <span className="text-[#111827] font-medium">{bill.vendor_name}</span>
              {bill.po_number && (
                <span className="ml-3 text-[12px] text-[#2563EB]">
                  (Origin PO: {bill.po_number})
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {bill.status !== 'Paid' && bill.status !== 'Cancelled' && (
              <Button
                onClick={() => setPaymentModalOpen(true)}
                className="bg-[#16A34A] hover:bg-green-700 text-white"
              >
                Register Payment
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

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-4">
          <span className="text-[12px] text-[#667085]">Bill Date</span>
          <p className="text-[15px] font-semibold text-[#111827] mt-0.5">
            {bill.bill_date ? new Date(bill.bill_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
          </p>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-4">
          <span className="text-[12px] text-[#667085]">Payment Due Date</span>
          <p className="text-[15px] font-semibold text-[#111827] mt-0.5">
            {bill.due_date ? new Date(bill.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
          </p>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-4">
          <span className="text-[12px] text-[#667085]">Total Bill Amount</span>
          <p className="text-[18px] font-semibold text-[#111827] mt-0.5">
            {formatCurrency(parseFloat(String(bill.total_amount)) || 0)}
          </p>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-4">
          <span className="text-[12px] text-[#667085]">Balance Due</span>
          <p className="text-[20px] font-semibold text-[#DC2626] mt-0.5">
            {formatCurrency(parseFloat(String(bill.balance_due)) || 0)}
          </p>
        </div>
      </div>

      {/* Bill Items */}
      <div className="bg-white border border-[#E5E7EB] rounded-enterprise overflow-hidden mb-6 shadow-xs">
        <div className="px-5 py-3 border-b border-[#E5E7EB] bg-[#F7F8FA]">
          <h2 className="text-[14px] font-semibold text-[#111827]">Line Items</h2>
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
            {(bill.items || []).map((item) => (
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
              <span className="font-mono text-[#111827]">{formatCurrency(parseFloat(String(bill.subtotal)) || 0)}</span>
            </div>
            <div className="flex justify-between text-[#667085]">
              <span>Tax Amount:</span>
              <span className="font-mono text-[#111827]">{formatCurrency(parseFloat(String(bill.tax_amount)) || 0)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-[#E5E7EB] font-semibold text-[#111827]">
              <span>Total Bill:</span>
              <span className="font-mono">{formatCurrency(parseFloat(String(bill.total_amount)) || 0)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Paid Amount:</span>
              <span className="font-mono">-{formatCurrency(parseFloat(String(bill.paid_amount)) || 0)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-[#E5E7EB] text-[15px] font-semibold text-[#DC2626]">
              <span>Balance Due:</span>
              <span className="font-mono">{formatCurrency(parseFloat(String(bill.balance_due)) || 0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white border border-[#E5E7EB] rounded-enterprise overflow-hidden mb-6 shadow-xs">
        <div className="px-5 py-3 border-b border-[#E5E7EB] bg-[#F7F8FA] flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-[#111827]">Payment Transactions & Disbursements</h2>
          <span className="text-[12px] text-[#667085]">{(bill.payments || []).length} payment(s) recorded</span>
        </div>

        {(bill.payments || []).length === 0 ? (
          <div className="p-6 text-center text-[13px] text-[#667085]">
            No payments have been registered for this bill yet.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#FAFAFA] text-[11px] font-semibold text-[#667085] uppercase tracking-wide">
                <th className="text-left py-2.5 px-4">Payment No.</th>
                <th className="text-left py-2.5 px-4">Date</th>
                <th className="text-left py-2.5 px-4">Payment Method</th>
                <th className="text-left py-2.5 px-4">Notes</th>
                <th className="text-right py-2.5 px-4">Amount Paid</th>
              </tr>
            </thead>
            <tbody>
              {bill.payments.map((p) => (
                <tr key={p.id} className="border-b border-[#F3F4F6] text-[13px]">
                  <td className="py-3 px-4 font-mono font-medium text-[#2563EB]">{p.payment_number}</td>
                  <td className="py-3 px-4 text-[#667085]">
                    {p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {p.payment_method}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[#667085]">{p.notes || '—'}</td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-[#16A34A]">
                    {formatCurrency(parseFloat(String(p.amount)) || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Register Payment Modal */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-enterprise border border-[#E5E7EB] shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 border-b border-[#E5E7EB] bg-[#F7F8FA] flex items-center justify-between">
              <div>
                <h3 className="text-[15px] font-semibold text-[#111827]">Register Payment</h3>
                <p className="text-[12px] text-[#667085]">Disburse payment against {bill.bill_number}</p>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="p-1 text-[#667085] hover:text-[#111827]"
              >
                <XIcon size={18} />
              </button>
            </div>

            <form onSubmit={handleRegisterPayment} className="p-5 space-y-4">
              {paymentError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-[12px] rounded-enterprise">
                  {paymentError}
                </div>
              )}

              <Input
                label="Payment Amount (₹)"
                type="number"
                step="0.01"
                required
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Payment Date"
                  type="date"
                  required
                  value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm((prev) => ({ ...prev, payment_date: e.target.value }))}
                />

                <Select
                  label="Payment Method"
                  value={paymentForm.payment_method}
                  onChange={(e) => setPaymentForm((prev) => ({ ...prev, payment_method: e.target.value }))}
                  options={[
                    { value: 'Bank', label: 'Bank Transfer' },
                    { value: 'Cash', label: 'Cash' },
                    { value: 'UPI', label: 'UPI' },
                    { value: 'Cheque', label: 'Cheque' },
                    { value: 'Card', label: 'Card' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#111827] mb-1">
                  Payment Reference / Notes
                </label>
                <textarea
                  rows={2}
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="e.g. UTR / Cheque No. or bank transaction ref"
                  className="w-full px-3 py-2 text-[13px] border border-[#E5E7EB] rounded-enterprise focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>

              <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-end gap-3">
                <Button type="button" variant="secondary" onClick={() => setPaymentModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmittingPayment}>
                  {isSubmittingPayment ? 'Processing...' : 'Confirm & Post Payment'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
