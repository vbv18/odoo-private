'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

interface Journal {
  id: string;
  journal_name: string;
  journal_type: string;
  description: string | null;
  default_debit_account_id: string | null;
  default_credit_account_id: string | null;
  debit_account_name: string | null;
  debit_account_code: string | null;
  credit_account_name: string | null;
  credit_account_code: string | null;
  is_archived: boolean;
  created_at: string;
}

export default function JournalDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [journal, setJournal] = useState<Journal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
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
    Promise.all([fetchJournal(token), fetchAccounts(token)]);
  }, [id, router]);

  const fetchJournal = async (token: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/journals/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setJournal(data.journal);
        setFormData({
          journal_name: data.journal.journal_name,
          journal_type: data.journal.journal_type,
          default_debit_account_id: data.journal.default_debit_account_id || '',
          default_credit_account_id: data.journal.default_credit_account_id || '',
          description: data.journal.description || '',
        });
      } else if (res.status === 404) {
        router.push('/journals');
      }
    } finally {
      setIsLoading(false);
    }
  };

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
            label: `${a.account_code} - ${a.account_name}`,
          }))
        );
      }
    } catch {}
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/journals/${id}`, {
        method: 'PUT',
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
        setJournal(data.journal);
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
    if (!window.confirm('Are you sure you want to archive this journal?')) return;
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/journals/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      router.push('/journals');
    } else {
      const d = await res.json();
      alert(d.message || 'Failed to archive');
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

  if (!journal) return null;

  return (
    <div className="max-w-[700px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <button
          onClick={() => router.push('/journals')}
          className="text-[13px] text-[#2563EB] hover:text-blue-700 mb-2 flex items-center gap-1 font-medium"
        >
          ← Back to Journals
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-semibold text-[#111827]">{journal.journal_name}</h1>
            <p className="text-[14px] text-[#667085] mt-1">{journal.journal_type} Journal</p>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <Button onClick={() => setIsEditing(true)} variant="secondary">
                Edit Journal
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
            disabled={!isEditing}
            required
          />

          <Select
            label="Journal Type"
            name="journal_type"
            value={formData.journal_type}
            onChange={handleChange}
            disabled={!isEditing}
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
            disabled={!isEditing}
            options={[{ value: '', label: '— None —' }, ...accounts]}
          />

          <Select
            label="Default Credit Account"
            name="default_credit_account_id"
            value={formData.default_credit_account_id}
            onChange={handleChange}
            disabled={!isEditing}
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
            disabled={!isEditing}
            placeholder="Detailed purpose of this journal..."
            className="w-full px-3.5 py-2.5 text-[14px] text-[#111827] bg-white border border-[#E5E7EB] rounded-enterprise focus:outline-none focus:ring-2 focus:ring-[#2563EB] disabled:bg-[#F7F8FA] disabled:text-[#667085]"
          />
        </div>

        {isEditing && (
          <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
