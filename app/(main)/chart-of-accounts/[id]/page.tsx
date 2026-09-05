'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

interface Account {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  parent_account_id: string | null;
  parent_account_name: string | null;
  is_system_account: boolean;
  opening_balance: number;
  current_balance: number;
  is_archived: boolean;
  created_at: string;
}

export default function AccountDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [account, setAccount] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [userRole, setUserRole] = useState('');
  const [parentAccounts, setParentAccounts] = useState<{ value: string; label: string }[]>([]);
  const [formData, setFormData] = useState({ account_name: '', account_type: '', parent_account_id: '', opening_balance: '' });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setUserRole(user.role);
    Promise.all([fetchAccount(token), fetchParents(token)]);
  }, [id]);

  const fetchAccount = async (token: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/chart-of-accounts/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setAccount(data.account);
        setFormData({
          account_name: data.account.account_name,
          account_type: data.account.account_type,
          parent_account_id: data.account.parent_account_id || '',
          opening_balance: String(data.account.opening_balance || 0),
        });
      } else if (res.status === 404) router.push('/chart-of-accounts');
    } finally { setIsLoading(false); }
  };

  const fetchParents = async (token: string) => {
    const res = await fetch('/api/chart-of-accounts', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      setParentAccounts(data.accounts
        .filter((a: any) => a.id !== id)
        .map((a: any) => ({ value: a.id, label: `${a.account_code} - ${a.account_name}` }))
      );
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/chart-of-accounts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...formData, parent_account_id: formData.parent_account_id || null, opening_balance: parseFloat(formData.opening_balance) || 0 }),
      });
      const data = await res.json();
      if (res.ok) { setAccount(data.account); setIsEditing(false); }
      else setErrors({ general: data.message });
    } catch { setErrors({ general: 'Network error' }); }
    finally { setIsSubmitting(false); }
  };

  const handleArchive = async () => {
    if (!window.confirm('Archive this account?')) return;
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/chart-of-accounts/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) router.push('/chart-of-accounts');
    else { const d = await res.json(); alert(d.message); }
  };

  if (isLoading) return <div className="p-8 animate-pulse"><div className="h-48 bg-gray-200 rounded" /></div>;
  if (!account) return null;

  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="max-w-[700px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <button onClick={() => router.push('/chart-of-accounts')} className="text-[13px] text-[#2563EB] hover:text-blue-700 mb-2">← Chart of Accounts</button>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[14px] text-[#667085]">{account.account_code}</span>
              {account.is_system_account && (
                <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded font-mono">SYSTEM</span>
              )}
            </div>
            <h1 className="text-[24px] font-semibold text-[#111827]">{account.account_name}</h1>
          </div>
          <div className="flex gap-2">
            {!isEditing && <Button onClick={() => setIsEditing(true)} variant="secondary">Edit</Button>}
            <Button onClick={() => router.push(`/chart-of-accounts/${id}/ledger`)} variant="secondary">View Ledger</Button>
            {userRole === 'Admin' && !account.is_system_account && (
              <Button onClick={handleArchive} variant="secondary" className="text-red-600 border-red-200 hover:bg-red-50">Archive</Button>
            )}
          </div>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-4">
          <p className="text-[12px] text-[#667085]">Current Balance</p>
          <p className="text-[22px] font-semibold text-[#111827]">{fmt(parseFloat(String(account.current_balance)) || 0)}</p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-4">
          <p className="text-[12px] text-[#667085]">Opening Balance</p>
          <p className="text-[22px] font-semibold text-[#111827]">{fmt(parseFloat(String(account.opening_balance)) || 0)}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-[#E5E7EB] rounded-enterprise p-6 space-y-4">
        {errors.general && <div className="p-3 bg-red-50 border border-red-200 rounded text-[13px] text-[#DC2626]">{errors.general}</div>}
        <Input label="Account Name" name="account_name" value={formData.account_name} onChange={handleChange} disabled={!isEditing || account.is_system_account} required />
        <div className="grid grid-cols-2 gap-4">
          <Select label="Account Type" name="account_type" value={formData.account_type} onChange={handleChange} disabled={!isEditing} options={[
            { value: 'Asset', label: 'Asset' }, { value: 'Liability', label: 'Liability' },
            { value: 'Income', label: 'Income' }, { value: 'Expense', label: 'Expense' }, { value: 'Capital', label: 'Capital' },
          ]} />
          <Input label="Opening Balance (₹)" type="number" step="0.01" name="opening_balance" value={formData.opening_balance} onChange={handleChange} disabled={!isEditing} />
        </div>
        <Select label="Parent Account" name="parent_account_id" value={formData.parent_account_id} onChange={handleChange} disabled={!isEditing}
          options={[{ value: '', label: '— No Parent —' }, ...parentAccounts]} />

        {isEditing && (
          <div className="pt-4 border-t flex gap-3">
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Changes'}</Button>
            <Button type="button" variant="secondary" onClick={() => setIsEditing(false)}>Cancel</Button>
          </div>
        )}
      </form>
    </div>
  );
}
