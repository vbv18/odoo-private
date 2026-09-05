'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

interface BudgetDetail {
  id: string;
  budget_name: string;
  analytic_account_id: string | null;
  analytic_account_name: string | null;
  period_start: string;
  period_end: string;
  planned_amount: number;
  achieved_amount: number;
  advanced_amount: number;
  status: 'Active' | 'Closed' | 'Over Budget';
  responsible_person_name: string | null;
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default function BudgetDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [budget, setBudget] = useState<BudgetDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    budget_name: '',
    status: 'Active',
    planned_amount: '',
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchBudget(token);
  }, [id, router]);

  const fetchBudget = async (token: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/budgets/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBudget(data.budget);
        setFormData({
          budget_name: data.budget.budget_name,
          status: data.budget.status,
          planned_amount: String(data.budget.planned_amount),
        });
      } else if (res.status === 404) {
        router.push('/budgets');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/budgets/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        setBudget(data.budget);
        setIsEditing(false);
      } else {
        setErrors({ general: data.message });
      }
    } catch {
      setErrors({ general: 'Network error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = async () => {
    if (!window.confirm('Are you sure you want to archive this budget?')) return;
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/budgets/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      router.push('/budgets');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-[700px] mx-auto px-4 py-8 animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-64 bg-gray-200 rounded" />
      </div>
    );
  }

  if (!budget) return null;

  const planned = parseFloat(String(budget.planned_amount)) || 1;
  const achieved = parseFloat(String(budget.achieved_amount)) || 0;
  const pct = Math.min(Math.round((achieved / planned) * 100), 100);

  return (
    <div className="max-w-[700px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <button
          onClick={() => router.push('/budgets')}
          className="text-[13px] text-[#2563EB] hover:text-blue-700 mb-2 flex items-center gap-1 font-medium"
        >
          ← Back to Budgets
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-semibold text-[#111827]">{budget.budget_name}</h1>
            <p className="text-[14px] text-[#667085] mt-1">
              Period: {new Date(budget.period_start).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} — {new Date(budget.period_end).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <Button onClick={() => setIsEditing(true)} variant="secondary">
                Edit Budget
              </Button>
            )}
            <Button
              onClick={handleArchive}
              variant="secondary"
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              Archive
            </Button>
          </div>
        </div>
      </div>

      {/* Progress Card */}
      <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-6 shadow-xs mb-6">
        <div className="flex justify-between items-center mb-3">
          <span className="text-[14px] font-semibold text-[#111827]">Utilization Overview</span>
          <span className="text-[13px] font-bold text-[#2563EB]">{pct}%</span>
        </div>
        <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden mb-3">
          <div
            className={`h-full rounded-full ${pct > 90 ? 'bg-red-500' : 'bg-[#2563EB]'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[#F3F4F6] text-center">
          <div>
            <span className="text-[11px] text-[#667085] block">Planned Target</span>
            <span className="font-mono font-bold text-[15px] text-[#111827]">{formatCurrency(planned)}</span>
          </div>
          <div>
            <span className="text-[11px] text-[#667085] block">Actual Spent</span>
            <span className="font-mono font-bold text-[15px] text-green-600">{formatCurrency(achieved)}</span>
          </div>
          <div>
            <span className="text-[11px] text-[#667085] block">Available Budget</span>
            <span className="font-mono font-bold text-[15px] text-[#2563EB]">{formatCurrency(Math.max(0, planned - achieved))}</span>
          </div>
        </div>
      </div>

      {isEditing && (
        <form onSubmit={handleUpdate} className="bg-white border border-[#E5E7EB] rounded-enterprise p-6 space-y-4 shadow-xs">
          {errors.general && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-[13px] rounded-enterprise">
              {errors.general}
            </div>
          )}

          <Input
            label="Budget Name"
            value={formData.budget_name}
            onChange={(e) => setFormData((prev) => ({ ...prev, budget_name: e.target.value }))}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Planned Amount (₹)"
              type="number"
              step="0.01"
              value={formData.planned_amount}
              onChange={(e) => setFormData((prev) => ({ ...prev, planned_amount: e.target.value }))}
              required
            />

            <Select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
              options={[
                { value: 'Active', label: 'Active' },
                { value: 'Closed', label: 'Closed' },
                { value: 'Over Budget', label: 'Over Budget' },
              ]}
            />
          </div>

          <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
