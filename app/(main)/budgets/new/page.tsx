'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

interface AnalyticAccount {
  id: string;
  account_name: string;
  account_type: string;
}

export default function NewBudgetPage() {
  const router = useRouter();
  const [analyticAccounts, setAnalyticAccounts] = useState<AnalyticAccount[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    budget_name: '',
    analytic_account_id: '',
    period_start: '2026-04-01',
    period_end: '2027-03-31',
    planned_amount: '',
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchAnalyticAccounts(token);
  }, [router]);

  const fetchAnalyticAccounts = async (token: string) => {
    try {
      const res = await fetch('/api/analytic-accounts', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setAnalyticAccounts(data.accounts || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.budget_name.trim()) {
      setErrors({ budget_name: 'Budget name is required' });
      return;
    }
    const amountVal = parseFloat(formData.planned_amount);
    if (!amountVal || amountVal <= 0) {
      setErrors({ planned_amount: 'Please enter a valid planned amount' });
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        router.push('/budgets');
      } else {
        setErrors({ general: data.message || 'Failed to create budget' });
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
          onClick={() => router.push('/budgets')}
          className="text-[13px] text-[#2563EB] hover:text-blue-700 mb-2 flex items-center gap-1 font-medium"
        >
          ← Back to Budgets
        </button>
        <h1 className="text-[24px] font-semibold text-[#111827]">New Budget</h1>
        <p className="text-[14px] text-[#667085] mt-1">Establish an annual or departmental spending target</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-[#E5E7EB] rounded-enterprise p-6 space-y-5 shadow-xs">
        {errors.general && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-[13px] rounded-enterprise">
            {errors.general}
          </div>
        )}

        <Input
          label="Budget Name"
          required
          value={formData.budget_name}
          onChange={(e) => setFormData((prev) => ({ ...prev, budget_name: e.target.value }))}
          error={errors.budget_name}
          placeholder="e.g. FY 2026-27 Marketing & Ad Spend"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Analytic Account (Cost Center)"
            value={formData.analytic_account_id}
            onChange={(e) => setFormData((prev) => ({ ...prev, analytic_account_id: e.target.value }))}
            options={[
              { value: '', label: '— None (Company-wide) —' },
              ...analyticAccounts.map((a) => ({ value: a.id, label: `${a.account_name} (${a.account_type})` })),
            ]}
          />

          <Input
            label="Planned Budget Amount (₹)"
            type="number"
            step="0.01"
            required
            value={formData.planned_amount}
            onChange={(e) => setFormData((prev) => ({ ...prev, planned_amount: e.target.value }))}
            error={errors.planned_amount}
            placeholder="500000"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Period Start Date"
            type="date"
            required
            value={formData.period_start}
            onChange={(e) => setFormData((prev) => ({ ...prev, period_start: e.target.value }))}
          />

          <Input
            label="Period End Date"
            type="date"
            required
            value={formData.period_end}
            onChange={(e) => setFormData((prev) => ({ ...prev, period_end: e.target.value }))}
          />
        </div>

        <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Budget'}
          </Button>
        </div>
      </form>
    </div>
  );
}
