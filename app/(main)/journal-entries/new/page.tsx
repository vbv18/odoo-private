'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { TrashIcon, PlusIcon } from '@/components/icons';

interface Account {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
}

interface Journal {
  id: string;
  journal_name: string;
}

interface Contact {
  id: string;
  name: string;
}

interface JournalLine {
  account_id: string;
  partner_id: string;
  description: string;
  debit_amount: number;
  credit_amount: number;
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default function NewJournalEntryPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [journals, setJournals] = useState<Journal[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    journal_id: '',
    entry_date: new Date().toISOString().split('T')[0],
    reference_number: '',
    description: '',
  });

  const [lines, setLines] = useState<JournalLine[]>([
    { account_id: '', partner_id: '', description: '', debit_amount: 0, credit_amount: 0 },
    { account_id: '', partner_id: '', description: '', debit_amount: 0, credit_amount: 0 },
  ]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchMasterData(token);
  }, [router]);

  const fetchMasterData = async (token: string) => {
    try {
      const [aRes, jRes, cRes] = await Promise.all([
        fetch('/api/chart-of-accounts', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/journals', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/contacts', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (aRes.ok) {
        const aData = await aRes.json();
        setAccounts(aData.accounts || []);
      }
      if (jRes.ok) {
        const jData = await jRes.json();
        setJournals(jData.journals || []);
        if (jData.journals?.length > 0) {
          setFormData((prev) => ({ ...prev, journal_id: jData.journals[0].id }));
        }
      }
      if (cRes.ok) {
        const cData = await cRes.json();
        setContacts(cData.contacts || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLineChange = (index: number, field: keyof JournalLine, val: any) => {
    setLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      // If debit is entered, credit must be 0 and vice versa
      if (field === 'debit_amount' && val > 0) next[index].credit_amount = 0;
      if (field === 'credit_amount' && val > 0) next[index].debit_amount = 0;
      return next;
    });
  };

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      { account_id: '', partner_id: '', description: '', debit_amount: 0, credit_amount: 0 },
    ]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 2) return;
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const totalDebit = lines.reduce((sum, l) => sum + (parseFloat(String(l.debit_amount)) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (parseFloat(String(l.credit_amount)) || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = difference < 0.01 && totalDebit > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!formData.journal_id) {
      setErrors({ journal_id: 'Please select a journal' });
      return;
    }
    if (lines.some((l) => !l.account_id)) {
      setErrors({ general: 'Every line item must have an account selected.' });
      return;
    }
    if (!isBalanced) {
      setErrors({
        general: totalDebit === 0 && totalCredit === 0
          ? 'Please enter debit and credit amounts for the line items.'
          : `Journal entry must be balanced: Total Debits (${formatCurrency(totalDebit)}) must equal Total Credits (${formatCurrency(totalCredit)}). Current difference: ${formatCurrency(difference)}.`,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/journal-entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          journal_id: formData.journal_id,
          entry_date: formData.entry_date,
          reference_number: formData.reference_number,
          reference: formData.reference_number,
          description: formData.description,
          narration: formData.description,
          status: 'Draft',
          lines: lines.map((l) => ({
            account_id: l.account_id,
            partner_id: l.partner_id || null,
            description: l.description || '',
            debit: parseFloat(String(l.debit_amount)) || 0,
            debit_amount: parseFloat(String(l.debit_amount)) || 0,
            credit: parseFloat(String(l.credit_amount)) || 0,
            credit_amount: parseFloat(String(l.credit_amount)) || 0,
          })),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/journal-entries/${data.entry.id}`);
      } else {
        setErrors({ general: data.message || 'Failed to create journal entry' });
      }
    } catch {
      setErrors({ general: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <button
          onClick={() => router.push('/journal-entries')}
          className="text-[13px] text-[#2563EB] hover:text-blue-700 mb-2 flex items-center gap-1 font-medium"
        >
          ← Back to Journal Entries
        </button>
        <h1 className="text-[24px] font-semibold text-[#111827]">New Journal Entry</h1>
        <p className="text-[14px] text-[#667085] mt-1">Post a double-entry accounting transaction to the general ledger</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.general && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-[13px] rounded-enterprise">
            {errors.general}
          </div>
        )}

        <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-6 grid grid-cols-1 md:grid-cols-3 gap-4 shadow-xs">
          <Select
            label="Journal"
            required
            value={formData.journal_id}
            onChange={(e) => setFormData((prev) => ({ ...prev, journal_id: e.target.value }))}
            error={errors.journal_id}
            options={[
              { value: '', label: 'Select Journal...' },
              ...journals.map((j) => ({ value: j.id, label: j.journal_name })),
            ]}
          />

          <Input
            label="Entry Date"
            type="date"
            required
            value={formData.entry_date}
            onChange={(e) => setFormData((prev) => ({ ...prev, entry_date: e.target.value }))}
          />

          <Input
            label="Reference #"
            value={formData.reference_number}
            onChange={(e) => setFormData((prev) => ({ ...prev, reference_number: e.target.value }))}
            placeholder="e.g. ADJ-001 or memo ref"
          />
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[16px] font-semibold text-[#111827]">Debit & Credit Lines</h2>
              <p className="text-[12px] text-[#667085]">Double-entry rule: Each debit must have an equal corresponding credit</p>
            </div>
            <Button type="button" variant="secondary" onClick={addLine} className="flex items-center gap-1.5 text-[12px]">
              <PlusIcon size={14} />
              <span>Add Line</span>
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F7F8FA] text-[11px] font-semibold text-[#667085] uppercase tracking-wide">
                  <th className="text-left py-2 px-3 w-[35%]">Account</th>
                  <th className="text-left py-2 px-3 w-[20%]">Partner</th>
                  <th className="text-left py-2 px-3 w-[20%]">Description</th>
                  <th className="text-right py-2 px-3 w-[12%]">Debit (₹)</th>
                  <th className="text-right py-2 px-3 w-[12%]">Credit (₹)</th>
                  <th className="text-right py-2 px-3 w-[5%]"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => (
                  <tr key={idx} className="border-b border-[#F3F4F6]">
                    <td className="py-2.5 px-3">
                      <select
                        value={line.account_id}
                        onChange={(e) => handleLineChange(idx, 'account_id', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-[13px] border border-[#E5E7EB] rounded-enterprise focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                      >
                        <option value="">Select Account...</option>
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.account_code} - {a.account_name} ({a.account_type})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2.5 px-3">
                      <select
                        value={line.partner_id}
                        onChange={(e) => handleLineChange(idx, 'partner_id', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-[13px] border border-[#E5E7EB] rounded-enterprise focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                      >
                        <option value="">— None —</option>
                        {contacts.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={line.description}
                        onChange={(e) => handleLineChange(idx, 'description', e.target.value)}
                        placeholder="Line memo..."
                        className="w-full px-2.5 py-1.5 text-[13px] border border-[#E5E7EB] rounded-enterprise focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.debit_amount || ''}
                        onChange={(e) => handleLineChange(idx, 'debit_amount', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full px-2.5 py-1.5 text-[13px] border border-[#E5E7EB] rounded-enterprise text-right focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.credit_amount || ''}
                        onChange={(e) => handleLineChange(idx, 'credit_amount', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full px-2.5 py-1.5 text-[13px] border border-[#E5E7EB] rounded-enterprise text-right focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {lines.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeLine(idx)}
                          className="p-1.5 text-[#667085] hover:text-red-600 transition-colors"
                        >
                          <TrashIcon size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Balance Checker Footer */}
          <div className="mt-6 pt-4 border-t border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className={`inline-block w-3 h-3 rounded-full ${isBalanced ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-[13px] font-semibold text-[#111827]">
                {isBalanced ? 'Entry is Balanced ✓' : `Out of balance by ${formatCurrency(difference)}`}
              </span>
            </div>

            <div className="flex items-center gap-8 text-[14px]">
              <div>
                <span className="text-[#667085] mr-2">Total Debit:</span>
                <span className="font-mono font-semibold text-[#111827]">{formatCurrency(totalDebit)}</span>
              </div>
              <div>
                <span className="text-[#667085] mr-2">Total Credit:</span>
                <span className="font-mono font-semibold text-[#111827]">{formatCurrency(totalCredit)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-6 shadow-xs">
          <label className="block text-[13px] font-medium text-[#111827] mb-1.5">
            Entry Narrative / Accounting Note
          </label>
          <textarea
            rows={2}
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Provide context or explanation for this journal entry..."
            className="w-full px-3.5 py-2 text-[13px] border border-[#E5E7EB] rounded-enterprise focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          />
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating Entry...' : 'Create Draft Entry'}
          </Button>
        </div>
      </form>
    </div>
  );
}
