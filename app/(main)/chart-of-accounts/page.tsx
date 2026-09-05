'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { PlusIcon } from '@/components/icons';

interface Account {
  id: string;
  account_code: string;
  account_name: string;
  account_type: 'Asset' | 'Liability' | 'Expense' | 'Income' | 'Capital';
  parent_account_id: string | null;
  parent_account_name: string | null;
  is_system_account: boolean;
  current_balance: number;
  is_archived: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  Asset: 'bg-blue-50 text-blue-700 border-blue-200',
  Liability: 'bg-red-50 text-red-700 border-red-200',
  Expense: 'bg-orange-50 text-orange-700 border-orange-200',
  Income: 'bg-green-50 text-green-700 border-green-200',
  Capital: 'bg-purple-50 text-purple-700 border-purple-200',
};

const TYPE_ORDER = ['Asset', 'Liability', 'Income', 'Expense', 'Capital'];

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default function ChartOfAccountsPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set(TYPE_ORDER));

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/chart-of-accounts', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts);
      }
    } catch (err) {
      console.error('Error fetching accounts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleType = (type: string) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const grouped = TYPE_ORDER.reduce<Record<string, Account[]>>((acc, type) => {
    acc[type] = accounts.filter((a) => a.account_type === type && !a.parent_account_id);
    return acc;
  }, {});

  const getChildren = (parentId: string) => accounts.filter((a) => a.parent_account_id === parentId);

  const AccountRow = ({ account, depth = 0 }: { account: Account; depth?: number }) => {
    const children = getChildren(account.id);
    return (
      <>
        <tr
          className="hover:bg-[#F7F8FA] cursor-pointer border-b border-[#F3F4F6] transition-colors"
          onClick={() => router.push(`/chart-of-accounts/${account.id}`)}
        >
          <td className="py-3 pr-4" style={{ paddingLeft: `${16 + depth * 24}px` }}>
            <div className="flex items-center gap-2">
              {depth > 0 && <span className="text-[#D1D5DB] text-[10px]">└</span>}
              <span className="font-mono text-[12px] text-[#667085]">{account.account_code}</span>
              <span className="text-[13px] text-[#111827] font-medium">{account.account_name}</span>
              {account.is_system_account && (
                <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded font-mono">SYSTEM</span>
              )}
            </div>
          </td>
          <td className="py-3 px-4">
            <span className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded-full border ${TYPE_COLORS[account.account_type]}`}>
              {account.account_type}
            </span>
          </td>
          <td className="py-3 px-4 text-right font-mono text-[13px] text-[#111827]">
            {formatCurrency(parseFloat(String(account.current_balance)) || 0)}
          </td>
          <td className="py-3 px-4">
            <button
              onClick={(e) => { e.stopPropagation(); router.push(`/chart-of-accounts/${account.id}/ledger`); }}
              className="text-[12px] text-[#2563EB] hover:underline"
            >
              Ledger
            </button>
          </td>
        </tr>
        {children.map((child) => <AccountRow key={child.id} account={child} depth={depth + 1} />)}
      </>
    );
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[24px] font-semibold text-[#111827]">Chart of Accounts</h1>
          <p className="text-[14px] text-[#667085] mt-1">Manage your account hierarchy and balances</p>
        </div>
        <Button onClick={() => router.push('/chart-of-accounts/new')} className="flex items-center gap-2">
          <PlusIcon size={16} />
          <span>New Account</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-gray-200 rounded" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {TYPE_ORDER.map((type) => {
            const typeAccounts = grouped[type] || [];
            const typeTotal = accounts
              .filter((a) => a.account_type === type)
              .reduce((sum, a) => sum + (parseFloat(String(a.current_balance)) || 0), 0);
            const isExpanded = expandedTypes.has(type);

            return (
              <div key={type} className="bg-white border border-[#E5E7EB] rounded-enterprise overflow-hidden">
                {/* Type Header */}
                <button
                  className="w-full flex items-center justify-between px-4 py-3 bg-[#F7F8FA] hover:bg-[#F3F4F6] transition-colors"
                  onClick={() => toggleType(type)}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${
                      type === 'Asset' ? 'bg-blue-500' : type === 'Liability' ? 'bg-red-500'
                      : type === 'Expense' ? 'bg-orange-500' : type === 'Income' ? 'bg-green-500' : 'bg-purple-500'
                    }`} />
                    <span className="text-[14px] font-semibold text-[#111827]">{type}</span>
                    <span className="text-[12px] text-[#667085]">
                      {accounts.filter((a) => a.account_type === type).length} accounts
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[13px] font-semibold text-[#111827]">{formatCurrency(typeTotal)}</span>
                    <span className="text-[#667085] text-[12px]">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </button>

                {/* Accounts Table */}
                {isExpanded && (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#E5E7EB]">
                        <th className="text-left py-2 px-4 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">Account</th>
                        <th className="text-left py-2 px-4 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">Type</th>
                        <th className="text-right py-2 px-4 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">Balance</th>
                        <th className="text-left py-2 px-4 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {typeAccounts.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-[13px] text-[#667085]">
                            No {type} accounts. <button onClick={() => router.push('/chart-of-accounts/new')} className="text-[#2563EB] hover:underline">Create one</button>
                          </td>
                        </tr>
                      ) : (
                        typeAccounts.map((account) => <AccountRow key={account.id} account={account} />)
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
