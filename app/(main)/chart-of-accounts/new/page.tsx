'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

export default function NewAccountPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [parentAccounts, setParentAccounts] = useState<{ value: string; label: string }[]>([]);
  const [formData, setFormData] = useState({
    account_code: '',
    account_name: '',
    account_type: '',
    parent_account_id: '',
    opening_balance: '',
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    fetchParentAccounts(token);
  }, []);

  const fetchParentAccounts = async (token: string) => {
    try {
      const res = await fetch('/api/chart-of-accounts', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setParentAccounts(data.accounts.map((a: any) => ({
          value: a.id,
          label: `${a.account_code} - ${a.account_name}`,
        })));
      }
    } catch {}
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!formData.account_code.trim()) newErrors.account_code = 'Account code is required';
    if (!formData.account_name.trim()) newErrors.account_name = 'Account name is required';
    if (!formData.account_type) newErrors.account_type = 'Account type is required';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/chart-of-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...formData,
          parent_account_id: formData.parent_account_id || null,
          opening_balance: parseFloat(formData.opening_balance) || 0,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push('/chart-of-accounts');
      } else {
        setErrors({ general: data.message || 'Failed to create account' });
      }
    } catch {
      setErrors({ general: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-[600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <button onClick={() => router.back()} className="text-[13px] text-[#2563EB] hover:text-blue-700 mb-2">← Back</button>
        <h1 className="text-[24px] font-semibold text-[#111827]">New Account</h1>
        <p className="text-[14px] text-[#667085] mt-1">Create a new account in the chart of accounts</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-[#E5E7EB] rounded-enterprise p-6 space-y-4">
        {errors.general && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-enterprise text-[13px] text-[#DC2626]">{errors.general}</div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Input label="Account Code" name="account_code" value={formData.account_code} onChange={handleChange} error={errors.account_code} required placeholder="e.g. 1110" />
          <Select label="Account Type" name="account_type" value={formData.account_type} onChange={handleChange} error={errors.account_type} required options={[
            { value: 'Asset', label: 'Asset' },
            { value: 'Liability', label: 'Liability' },
            { value: 'Income', label: 'Income' },
            { value: 'Expense', label: 'Expense' },
            { value: 'Capital', label: 'Capital' },
          ]} />
        </div>
        <Input label="Account Name" name="account_name" value={formData.account_name} onChange={handleChange} error={errors.account_name} required placeholder="e.g. Cash in Hand" />
        <Select label="Parent Account (optional)" name="parent_account_id" value={formData.parent_account_id} onChange={handleChange} options={[{ value: '', label: '— No Parent (Top Level) —' }, ...parentAccounts]} />
        <Input label="Opening Balance (₹)" type="number" step="0.01" name="opening_balance" value={formData.opening_balance} onChange={handleChange} placeholder="0.00" />

        <div className="pt-4 border-t border-[#E5E7EB] flex gap-3">
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create Account'}</Button>
          <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
