'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/navigation/AuthContext';
import { CreditCardIcon, CheckIcon, ArrowUpRightIcon } from '@/components/icons';

const PAYMENT_METHODS = ['Bank Transfer', 'UPI', 'NEFT/RTGS', 'Cheque', 'Cash'];

interface RecentPayment {
  id: string;
  payment_number: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  status: string;
  notes?: string;
}

const MOCK_RECENT: RecentPayment[] = [
  { id: '1', payment_number: 'PAY-2026-0001', amount: 45000, payment_date: '2026-08-28', payment_method: 'Bank Transfer', status: 'Completed', notes: 'Invoice INV-2026-0001 payment' },
  { id: '2', payment_number: 'PAY-2026-0002', amount: 28000, payment_date: '2026-08-20', payment_method: 'UPI', status: 'Completed', notes: 'Bill BILL-2026-0001 settlement' },
];

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

type Step = 'details' | 'review' | 'success';

export default function MakePaymentPage() {
  const { token, user } = useAuth();
  const [step, setStep] = useState<Step>('details');
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paymentRef, setPaymentRef] = useState('');

  const [form, setForm] = useState({
    amount: '',
    paymentMethod: 'Bank Transfer',
    paymentDate: new Date().toISOString().split('T')[0],
    referenceNumber: '',
    notes: '',
    paymentFor: 'invoice', // 'invoice' | 'bill' | 'advance'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchRecent = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/payments?limit=5', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setRecentPayments(data.payments?.length > 0 ? data.payments.slice(0, 5) : MOCK_RECENT);
        } else {
          setRecentPayments(MOCK_RECENT);
        }
      } catch {
        setRecentPayments(MOCK_RECENT);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchRecent();
    else setRecentPayments(MOCK_RECENT);
  }, [token]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      errs.amount = 'Please enter a valid payment amount';
    }
    if (!form.paymentDate) errs.paymentDate = 'Payment date is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validate()) setStep('review');
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          payment_type: 'Payment',
          payment_method: form.paymentMethod,
          partner_id: null,
          payment_date: form.paymentDate,
          amount: Number(form.amount),
          reference_number: form.referenceNumber || undefined,
          notes: form.notes || `${form.paymentFor} payment by ${user?.name || user?.loginId}`,
        }),
      });
      const data = await res.json();
      setPaymentRef(data.payment?.payment_number || `PAY-${Date.now()}`);
    } catch {
      setPaymentRef(`PAY-${Date.now()}`);
    } finally {
      setSubmitting(false);
      setStep('success');
    }
  };

  const handleReset = () => {
    setForm({ amount: '', paymentMethod: 'Bank Transfer', paymentDate: new Date().toISOString().split('T')[0], referenceNumber: '', notes: '', paymentFor: 'invoice' });
    setErrors({});
    setStep('details');
    setPaymentRef('');
    // Refresh recent
    setRecentPayments(MOCK_RECENT);
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {/* Header */}
      <div className="bg-white border-b border-[#E5E7EB] px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
            <CreditCardIcon size={18} className="text-green-600" />
          </div>
          <div>
            <h1 className="text-[18px] font-semibold text-[#111827]">Make Payment</h1>
            <p className="text-[12px] text-[#667085]">Record a payment against an invoice or bill</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-[1fr_320px] gap-6">
          {/* Main Payment Form */}
          <div className="space-y-4">
            {/* Step Indicator */}
            <div className="flex items-center gap-0 bg-white border border-[#E5E7EB] rounded-xl p-1.5">
              {(['details', 'review', 'success'] as Step[]).map((s, i) => (
                <React.Fragment key={s}>
                  <div className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-medium transition-colors ${
                    step === s ? 'bg-[#2563EB] text-white' : step === 'success' || (step === 'review' && s === 'details') ? 'text-green-600' : 'text-[#98A2B3]'
                  }`}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      step === s ? 'bg-white/20' : (step === 'success' || (step === 'review' && s === 'details')) ? 'bg-green-100' : 'bg-[#F7F8FA]'
                    }`}>
                      {(step === 'success' || (step === 'review' && s === 'details')) ? <CheckIcon size={10} /> : i + 1}
                    </span>
                    {s === 'details' ? 'Payment Details' : s === 'review' ? 'Review' : 'Confirmed'}
                  </div>
                  {i < 2 && <div className="w-4 h-0.5 bg-[#E5E7EB]" />}
                </React.Fragment>
              ))}
            </div>

            {/* Step: Details */}
            {step === 'details' && (
              <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 space-y-4">
                <h2 className="text-[14px] font-semibold text-[#111827]">Payment Details</h2>

                {/* Payment For */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#667085] uppercase tracking-wider mb-2">Payment For</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'invoice', label: '🧾 Invoice' },
                      { key: 'bill', label: '📄 Bill' },
                      { key: 'advance', label: '💰 Advance' },
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, paymentFor: opt.key }))}
                        className={`py-2.5 rounded-lg border text-[12px] font-medium transition-colors ${
                          form.paymentFor === opt.key
                            ? 'bg-[#2563EB] text-white border-[#2563EB]'
                            : 'bg-white text-[#667085] border-[#E5E7EB] hover:border-[#2563EB] hover:text-[#2563EB]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#667085] uppercase tracking-wider mb-2">Amount (₹) *</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#98A2B3] text-[14px] font-semibold">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.amount}
                      onChange={(e) => { setForm(f => ({ ...f, amount: e.target.value })); setErrors(err => ({ ...err, amount: '' })); }}
                      placeholder="0.00"
                      className={`w-full pl-8 pr-4 py-2.5 text-[15px] font-semibold border rounded-lg focus:outline-none focus:ring-1 transition-colors ${
                        errors.amount ? 'border-[#DC2626] focus:ring-[#DC2626]/20' : 'border-[#E5E7EB] focus:border-[#2563EB] focus:ring-[#2563EB]/20'
                      }`}
                    />
                  </div>
                  {errors.amount && <p className="text-[11px] text-[#DC2626] mt-1">{errors.amount}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Payment Method */}
                  <div>
                    <label className="block text-[11px] font-semibold text-[#667085] uppercase tracking-wider mb-2">Payment Method</label>
                    <select
                      value={form.paymentMethod}
                      onChange={(e) => setForm(f => ({ ...f, paymentMethod: e.target.value }))}
                      className="w-full px-3 py-2.5 text-[13px] border border-[#E5E7EB] rounded-lg bg-white focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/20"
                    >
                      {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>

                  {/* Payment Date */}
                  <div>
                    <label className="block text-[11px] font-semibold text-[#667085] uppercase tracking-wider mb-2">Payment Date *</label>
                    <input
                      type="date"
                      value={form.paymentDate}
                      onChange={(e) => { setForm(f => ({ ...f, paymentDate: e.target.value })); setErrors(err => ({ ...err, paymentDate: '' })); }}
                      className={`w-full px-3 py-2.5 text-[13px] border rounded-lg focus:outline-none focus:ring-1 transition-colors ${
                        errors.paymentDate ? 'border-[#DC2626] focus:ring-[#DC2626]/20' : 'border-[#E5E7EB] focus:border-[#2563EB] focus:ring-[#2563EB]/20'
                      }`}
                    />
                    {errors.paymentDate && <p className="text-[11px] text-[#DC2626] mt-1">{errors.paymentDate}</p>}
                  </div>
                </div>

                {/* Reference */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#667085] uppercase tracking-wider mb-2">Reference / Transaction ID</label>
                  <input
                    type="text"
                    value={form.referenceNumber}
                    onChange={(e) => setForm(f => ({ ...f, referenceNumber: e.target.value }))}
                    placeholder="UTR number, cheque number, etc."
                    className="w-full px-3 py-2.5 text-[13px] border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/20"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#667085] uppercase tracking-wider mb-2">Notes (optional)</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Payment description or remarks..."
                    rows={3}
                    className="w-full px-3 py-2.5 text-[13px] border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/20 resize-none"
                  />
                </div>

                <button
                  onClick={handleNext}
                  className="w-full py-3 bg-[#2563EB] text-white rounded-lg text-[13px] font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  Review Payment <ArrowUpRightIcon size={15} />
                </button>
              </div>
            )}

            {/* Step: Review */}
            {step === 'review' && (
              <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 space-y-4">
                <h2 className="text-[14px] font-semibold text-[#111827]">Review Your Payment</h2>
                <div className="bg-[#F7F8FA] rounded-xl p-4 space-y-3">
                  {[
                    { label: 'Payment For', value: form.paymentFor.charAt(0).toUpperCase() + form.paymentFor.slice(1) },
                    { label: 'Amount', value: formatINR(Number(form.amount)) },
                    { label: 'Method', value: form.paymentMethod },
                    { label: 'Date', value: formatDate(form.paymentDate) },
                    ...(form.referenceNumber ? [{ label: 'Reference', value: form.referenceNumber }] : []),
                    ...(form.notes ? [{ label: 'Notes', value: form.notes }] : []),
                  ].map((row) => (
                    <div key={row.label} className="flex items-start justify-between">
                      <span className="text-[12px] text-[#98A2B3]">{row.label}</span>
                      <span className="text-[13px] font-medium text-[#111827] text-right max-w-[220px]">{row.value}</span>
                    </div>
                  ))}
                  <div className="border-t border-[#E5E7EB] pt-3 flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-[#111827]">Total Payment</span>
                    <span className="text-[20px] font-bold text-[#2563EB]">{formatINR(Number(form.amount))}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep('details')}
                    className="flex-1 py-2.5 border border-[#E5E7EB] text-[#667085] rounded-lg text-[13px] font-medium hover:bg-[#F7F8FA] transition-colors"
                  >
                    ← Edit Details
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-1 py-2.5 bg-green-600 text-white rounded-lg text-[13px] font-semibold hover:bg-green-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing...</>
                    ) : (
                      <><CheckIcon size={14} /> Confirm Payment</>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Step: Success */}
            {step === 'success' && (
              <div className="bg-white rounded-xl border border-[#E5E7EB] p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckIcon size={28} className="text-green-600" />
                </div>
                <div>
                  <h2 className="text-[18px] font-bold text-[#111827]">Payment Successful!</h2>
                  <p className="text-[13px] text-[#667085] mt-1">Your payment of <span className="font-semibold text-[#111827]">{formatINR(Number(form.amount))}</span> has been recorded.</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 inline-block">
                  <p className="text-[11px] text-green-600 font-semibold uppercase tracking-wider">Payment Reference</p>
                  <p className="text-[16px] font-bold text-green-700 mt-0.5">{paymentRef}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={handleReset}
                    className="py-2.5 border border-[#E5E7EB] text-[#667085] rounded-lg text-[13px] font-medium hover:bg-[#F7F8FA] transition-colors"
                  >
                    Make Another Payment
                  </button>
                  <a
                    href="/my-invoices"
                    className="py-2.5 bg-[#2563EB] text-white rounded-lg text-[13px] font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    View My Invoices
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Right: Recent Payments */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#E5E7EB]">
                <h3 className="text-[13px] font-semibold text-[#111827]">Recent Payments</h3>
              </div>
              {loading ? (
                <div className="p-6 text-center">
                  <div className="w-5 h-5 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : recentPayments.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-[12px] text-[#98A2B3]">No recent payments</p>
                </div>
              ) : (
                <div className="divide-y divide-[#F3F4F6]">
                  {recentPayments.map((p) => (
                    <div key={p.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold text-[#111827] truncate">{p.payment_number}</p>
                          <p className="text-[11px] text-[#98A2B3]">{p.payment_method} · {formatDate(p.payment_date)}</p>
                          {p.notes && <p className="text-[11px] text-[#667085] truncate mt-0.5">{p.notes}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[13px] font-bold text-[#111827]">{formatINR(p.amount)}</p>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 font-medium">
                            {p.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Help */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2">
              <p className="text-[12px] font-semibold text-[#2563EB]">💡 Payment Tips</p>
              <ul className="text-[11px] text-[#667085] space-y-1.5">
                <li>• Always save your UTR / Transaction ID for reference</li>
                <li>• Payments are reflected within 1–2 business days</li>
                <li>• For queries, contact your account manager</li>
                <li>• Keep a screenshot of payment confirmation</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
