'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

interface Contact {
  id: string;
  name: string;
  contact_type: string;
}

export default function NewPaymentPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    payment_type: 'Receipt',
    payment_method: 'Bank',
    partner_id: '',
    payment_date: new Date().toISOString().split('T')[0],
    amount: '',
    reference_number: '',
    notes: '',
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchContacts(token);
  }, [router]);

  const fetchContacts = async (token: string) => {
    try {
      const res = await fetch('/api/contacts', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredPartners = contacts.filter((c) => {
    if (formData.payment_type === 'Receipt') {
      return c.contact_type === 'Customer' || c.contact_type === 'Both';
    } else {
      return c.contact_type === 'Vendor' || c.contact_type === 'Both';
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.partner_id) {
      setErrors({ partner_id: 'Please select a partner' });
      return;
    }
    const amountVal = parseFloat(formData.amount);
    if (!amountVal || amountVal <= 0) {
      setErrors({ amount: 'Please enter a valid positive amount' });
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/payments/${data.payment.id}`);
      } else {
        setErrors({ general: data.message || 'Failed to record payment' });
      }
    } catch {
      setErrors({ general: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-[700px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <button
          onClick={() => router.push('/payments')}
          className="text-[13px] text-[#2563EB] hover:text-blue-700 mb-2 flex items-center gap-1 font-medium"
        >
          ← Back to Payments
        </button>
        <h1 className="text-[24px] font-semibold text-[#111827]">Record Payment / Receipt</h1>
        <p className="text-[14px] text-[#667085] mt-1">Record a cash or bank voucher in the system</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-[#E5E7EB] rounded-enterprise p-6 space-y-5 shadow-xs">
        {errors.general && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-[13px] rounded-enterprise">
            {errors.general}
          </div>
        )}

        {/* Transaction Type Radio Selector */}
        <div>
          <label className="block text-[13px] font-medium text-[#111827] mb-2">
            Payment Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, payment_type: 'Receipt', partner_id: '' }))}
              className={`py-2.5 px-4 rounded-enterprise border text-[13px] font-semibold transition-all ${
                formData.payment_type === 'Receipt'
                  ? 'bg-green-50 text-green-700 border-green-500 shadow-xs'
                  : 'bg-white text-[#667085] border-[#E5E7EB] hover:bg-[#F7F8FA]'
              }`}
            >
              ↓ Money In (Customer Receipt)
            </button>
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, payment_type: 'Payment', partner_id: '' }))}
              className={`py-2.5 px-4 rounded-enterprise border text-[13px] font-semibold transition-all ${
                formData.payment_type === 'Payment'
                  ? 'bg-red-50 text-red-700 border-red-500 shadow-xs'
                  : 'bg-white text-[#667085] border-[#E5E7EB] hover:bg-[#F7F8FA]'
              }`}
            >
              ↑ Money Out (Vendor Disbursement)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label={formData.payment_type === 'Receipt' ? 'Customer' : 'Vendor'}
            required
            value={formData.partner_id}
            onChange={(e) => setFormData((prev) => ({ ...prev, partner_id: e.target.value }))}
            error={errors.partner_id}
            options={[
              { value: '', label: 'Select Counterparty...' },
              ...filteredPartners.map((p) => ({ value: p.id, label: p.name })),
            ]}
          />

          <Input
            label="Amount (₹)"
            type="number"
            step="0.01"
            required
            value={formData.amount}
            onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
            error={errors.amount}
            placeholder="0.00"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Payment Date"
            type="date"
            required
            value={formData.payment_date}
            onChange={(e) => setFormData((prev) => ({ ...prev, payment_date: e.target.value }))}
          />

          <Select
            label="Payment Method"
            value={formData.payment_method}
            onChange={(e) => setFormData((prev) => ({ ...prev, payment_method: e.target.value }))}
            options={[
              { value: 'Bank', label: 'Bank Wire / Transfer' },
              { value: 'Cash', label: 'Cash in Hand' },
              { value: 'UPI', label: 'UPI' },
              { value: 'Cheque', label: 'Cheque' },
              { value: 'Card', label: 'Card Payment' },
            ]}
          />
        </div>

        <div>
          <Input
            label="Cheque / UTR / Reference No."
            value={formData.reference_number}
            onChange={(e) => setFormData((prev) => ({ ...prev, reference_number: e.target.value }))}
            placeholder="e.g. UTR-9823481923"
          />
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[#111827] mb-1.5">
            Remarks / Purpose
          </label>
          <textarea
            rows={2}
            value={formData.notes}
            onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Voucher narrative or description..."
            className="w-full px-3.5 py-2 text-[13px] border border-[#E5E7EB] rounded-enterprise focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          />
        </div>

        <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Posting Voucher...' : 'Confirm & Post Voucher'}
          </Button>
        </div>
      </form>
    </div>
  );
}
