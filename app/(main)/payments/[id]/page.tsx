'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';

interface PaymentDetail {
  id: string;
  payment_number: string;
  payment_type: 'Receipt' | 'Payment';
  payment_method: string;
  payment_date: string;
  amount: number;
  reference_type: string | null;
  reference_number: string | null;
  partner_name: string | null;
  partner_email: string | null;
  partner_mobile: string | null;
  partner_address: string | null;
  notes: string | null;
  created_at: string;
  created_by_name: string | null;
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default function PaymentVoucherPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [payment, setPayment] = useState<PaymentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchPayment(token);
  }, [id, router]);

  const fetchPayment = async (token: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/payments/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPayment(data.payment);
      } else if (res.status === 404) {
        router.push('/payments');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-[800px] mx-auto px-4 py-8 animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-64 bg-gray-200 rounded" />
      </div>
    );
  }

  if (!payment) return null;

  return (
    <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => router.push('/payments')}
          className="text-[13px] text-[#2563EB] hover:text-blue-700 flex items-center gap-1 font-medium"
        >
          ← Back to Payments
        </button>
        <Button variant="secondary" onClick={() => window.print()} className="text-[12px]">
          Print Voucher
        </Button>
      </div>

      {/* Official Voucher Card */}
      <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-8 shadow-md">
        <div className="flex items-start justify-between border-b border-[#E5E7EB] pb-6 mb-6">
          <div>
            <span className="text-[11px] font-bold text-[#667085] uppercase tracking-wider">
              {payment.payment_type === 'Receipt' ? 'Official Receipt Voucher' : 'Payment Disbursement Voucher'}
            </span>
            <h1 className="text-[26px] font-bold text-[#111827] mt-1">{payment.payment_number}</h1>
            <p className="text-[13px] text-[#667085]">LedgerCraft Enterprise Accounting</p>
          </div>
          <div className="text-right">
            <span className={`inline-block px-3 py-1 text-[12px] font-bold rounded-full border ${
              payment.payment_type === 'Receipt'
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              {payment.payment_type.toUpperCase()}
            </span>
            <p className="text-[13px] text-[#667085] mt-2 font-mono">
              Date: {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
            </p>
          </div>
        </div>

        {/* Voucher Info */}
        <div className="grid grid-cols-2 gap-6 mb-8 text-[13px]">
          <div className="bg-[#F7F8FA] p-4 rounded-enterprise">
            <span className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider block mb-1">
              {payment.payment_type === 'Receipt' ? 'Received From' : 'Paid To'}
            </span>
            <p className="text-[15px] font-semibold text-[#111827]">{payment.partner_name || 'Counterparty'}</p>
            {payment.partner_email && <p className="text-[#667085] mt-0.5">{payment.partner_email}</p>}
            {payment.partner_address && <p className="text-[#667085] mt-0.5">{payment.partner_address}</p>}
          </div>

          <div className="bg-[#F7F8FA] p-4 rounded-enterprise space-y-2">
            <div>
              <span className="text-[#667085]">Disbursement Method:</span>
              <span className="font-semibold text-[#111827] ml-2">{payment.payment_method}</span>
            </div>
            {payment.reference_number && (
              <div>
                <span className="text-[#667085]">Reference / Cheque:</span>
                <span className="font-mono text-[#111827] ml-2">{payment.reference_number}</span>
              </div>
            )}
            {payment.created_by_name && (
              <div>
                <span className="text-[#667085]">Authorized By:</span>
                <span className="text-[#111827] ml-2">{payment.created_by_name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Big Amount Block */}
        <div className="border border-[#E5E7EB] rounded-enterprise p-6 bg-[#FAFAFA] flex items-center justify-between mb-8">
          <div>
            <span className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider block">
              Settlement Amount
            </span>
            <p className="text-[13px] text-[#667085] mt-1">
              Indian National Rupees (INR)
            </p>
          </div>
          <div className="text-right">
            <span className={`text-[32px] font-bold font-mono ${
              payment.payment_type === 'Receipt' ? 'text-[#16A34A]' : 'text-[#DC2626]'
            }`}>
              {formatCurrency(parseFloat(String(payment.amount)) || 0)}
            </span>
          </div>
        </div>

        {payment.notes && (
          <div className="mb-8 text-[13px]">
            <span className="font-semibold text-[#111827] block mb-1">Narrative:</span>
            <p className="text-[#667085] bg-white border border-[#E5E7EB] p-3 rounded-enterprise">{payment.notes}</p>
          </div>
        )}

        {/* Signature blocks */}
        <div className="pt-12 grid grid-cols-2 gap-12 text-center text-[12px] text-[#667085]">
          <div className="border-t border-dashed border-[#9CA3AF] pt-2">
            Prepared / Authorized Signatory
          </div>
          <div className="border-t border-dashed border-[#9CA3AF] pt-2">
            Receiver / Counterparty Signature
          </div>
        </div>
      </div>
    </div>
  );
}
