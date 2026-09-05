'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

export default function NewJournalPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [accounts, setAccounts] = useState<{ value: string; label: string }[]>([]);
  const [formData, setFormData] = useState({
    journal_name: '',
    journal_type: '',
    default_debit_account_id: '',
    default_credit_account_id: '',
    description: '',
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchAccounts(token);
  }, [router]);

  const fetchAccounts = async (token: string) => {
    try {
      const res = await fetch('/api/chart-of-accounts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAccounts(
          data.accounts.map((a: any) => ({
            value: a.id,
            label: `${a.account_code} - ${a.account_name} (${a.account_type})`,
          }))
        );
      }
    } catch (err) {
      console.error('Error fetching accounts:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!formData.journal_name.trim()) newErrors.journal_name = 'Journal name is required';
    if (!formData.journal_type) newErrors.journal_type = 'Journal type is required';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/journals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          default_debit_account_id: formData.default_debit_account_id || null,
          default_credit_account_id: formData.default_credit_account_id || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push('/journals');
      } else {
        setErrors({ general: data.message || 'Failed to create journal' });
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
          onClick={() => router.back()}
          className="text-[13px] text-[#2563EB] hover:text-blue-700 mb-2 flex items-center gap-1 font-medium"
        >
          ← Back to Journals
        </button>
        <h1 className="text-[24px] font-semibold text-[#111827]">Create New Journal</h1>
        <p className="text-[14px] text-[#667085] mt-1">Add a transaction ledger with default accounts</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-[#E5E7EB] rounded-enterprise p-6 space-y-5">
        {errors.general && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-enterprise text-[13px] text-[#DC2626]">
            {errors.general}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Journal Name"
            name="journal_name"
            value={formData.journal_name}
            onChange={handleChange}
            error={errors.journal_name}
            required
            placeholder="e.g. Customer Invoices"
          />

          <Select
            label="Journal Type"
            name="journal_type"
            value={formData.journal_type}
            onChange={handleChange}
            error={errors.journal_type}
            required
            options={[
              { value: 'Sales', label: 'Sales' },
              { value: 'Purchase', label: 'Purchase' },
              { value: 'Bank', label: 'Bank' },
              { value: 'Cash', label: 'Cash' },
              { value: 'General', label: 'General' },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Default Debit Account"
            name="default_debit_account_id"
            value={formData.default_debit_account_id}
            onChange={handleChange}
            options={[{ value: '', label: '— None —' }, ...accounts]}
          />

          <Select
            label="Default Credit Account"
            name="default_credit_account_id"
            value={formData.default_credit_account_id}
            onChange={handleChange}
            options={[{ value: '', label: '— None —' }, ...accounts]}
          />
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[#111827] mb-1.5">
            Description
          </label>
          <textarea
            name="description"
            rows={3}
            value={formData.description}
            onChange={handleChange}
            placeholder="Detailed purpose of this journal..."
            className="w-full px-3.5 py-2.5 text-[14px] text-[#111827] bg-white border border-[#E5E7EB] rounded-enterprise focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
          />
        </div>

        <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Journal'}
          </Button>
        </div>
      </form>
    </div>
  );
}
