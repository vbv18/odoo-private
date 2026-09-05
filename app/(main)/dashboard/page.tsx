'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/dashboard/Header';
import { KpiRow } from '@/components/dashboard/KpiCard';
import { SalesPurchaseSnapshot } from '@/components/dashboard/SalesPurchaseSnapshot';
import { BudgetCard } from '@/components/dashboard/BudgetCard';
import { RecentActivityTable } from '@/components/dashboard/RecentActivityTable';
import { AiInsightsStrip } from '@/components/dashboard/AiInsightsStrip';
import { TransactionDetailDrawer } from '@/components/dashboard/TransactionDetailDrawer';
import { NewTransactionModal } from '@/components/dashboard/NewTransactionModal';
import { AiInsightDrawer } from '@/components/dashboard/AiInsightDrawer';
import { useSidebar } from '@/components/navigation/LayoutContext';
import {
  INITIAL_KPIS,
  INITIAL_TRANSACTIONS,
  Transaction,
  TransactionType,
  AiInsight,
} from '@/lib/dashboard-data';
import { CheckIcon, XIcon } from '@/components/icons';

const LS_KEY = 'ledgercraft_transactions';

function loadFromLocalStorage(): Transaction[] | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Transaction[];
  } catch {
    return null;
  }
}

function saveToLocalStorage(txs: Transaction[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(txs));
  } catch {}
}

export default function Dashboard() {
  const { setMobileSidebarOpen } = useSidebar();
  const [selectedPeriod, setSelectedPeriod] = useState('This Month (September 2026)');
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [kpis, setKpis] = useState(INITIAL_KPIS);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [selectedInsight, setSelectedInsight] = useState<AiInsight | null>(null);
  const [newTxModalOpen, setNewTxModalOpen] = useState(false);
  const [newTxInitialType, setNewTxInitialType] = useState<TransactionType>('SO');
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token') || '';

    // Hydrate from localStorage immediately
    const cached = loadFromLocalStorage();
    if (cached && cached.length > 0) {
      setTransactions(cached);
    }

    // Fetch fresher data from API
    if (token) fetchTransactionsFromApi(token);
  }, []);

  const fetchTransactionsFromApi = async (token: string) => {
    try {
      const res = await fetch('/api/dashboard/transactions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.transactions && data.transactions.length > 0) {
          // Map API rows to the Transaction shape used by the UI
          const mapped: Transaction[] = data.transactions.map((t: any) => ({
            id: t.id || `tx-${Date.now()}`,
            date: t.date
              ? new Date(t.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
              : '05 Sep 2026',
            type: t.type as TransactionType,
            referenceNo: t.reference_no || t.type,
            partner: t.partner || '—',
            amount: parseFloat(t.amount) || 0,
            status: t.status || 'Draft',
            dueDate: t.due_date
              ? new Date(t.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
              : undefined,
            notes: t.notes || undefined,
            lineItems: [],
            timeline: [{ title: `${t.type} created`, timestamp: 'From database', user: 'System' }],
          }));
          // Merge: DB records first, then any localStorage-only entries not yet in DB
          setTransactions((prev) => {
            const dbRefs = new Set(mapped.map((m) => m.referenceNo));
            const localOnly = prev.filter((p) => !dbRefs.has(p.referenceNo) && p.id.startsWith('tx-new'));
            const merged = [...mapped, ...localOnly];
            saveToLocalStorage(merged);
            return merged;
          });
        }
      }
    } catch {
      // API unavailable — keep localStorage / initial data
    }
  };

  // Show temporary toast notification
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((cur) => (cur === message ? null : cur));
    }, 4000);
  };

  // Open modal with pre-selected transaction type
  const handleOpenNewTransaction = (type: TransactionType = 'SO') => {
    setNewTxInitialType(type);
    setNewTxModalOpen(true);
  };

  // Create new transaction handler — saves to localStorage immediately + API in background
  const handleCreateTransaction = async (newTx: Transaction) => {
    // Optimistically update UI and localStorage
    setTransactions((prev) => {
      const updated = [newTx, ...prev];
      saveToLocalStorage(updated);
      return updated;
    });

    // Update receivables or payables KPI dynamically
    if (newTx.type === 'Invoice' || newTx.type === 'SO') {
      setKpis((prev) =>
        prev.map((kpi) =>
          kpi.id === 'receivables'
            ? {
                ...kpi,
                value: kpi.value + newTx.amount,
                formattedValue: new Intl.NumberFormat('en-IN', {
                  style: 'currency',
                  currency: 'INR',
                  maximumFractionDigits: 0,
                }).format(kpi.value + newTx.amount),
              }
            : kpi
        )
      );
    } else if (newTx.type === 'Bill' || newTx.type === 'PO') {
      setKpis((prev) =>
        prev.map((kpi) =>
          kpi.id === 'payables'
            ? {
                ...kpi,
                value: kpi.value + newTx.amount,
                formattedValue: new Intl.NumberFormat('en-IN', {
                  style: 'currency',
                  currency: 'INR',
                  maximumFractionDigits: 0,
                }).format(kpi.value + newTx.amount),
              }
            : kpi
        )
      );
    }

    showToast(`Recorded ${newTx.type} ${newTx.referenceNo} for ${newTx.partner}`);

    // Persist to DB in background (non-blocking)
    try {
      const token = localStorage.getItem('token');
      await fetch('/api/dashboard/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: newTx.type,
          partner: newTx.partner,
          amount: newTx.amount,
          dueDate: newTx.dueDate,
          notes: newTx.notes,
          itemDesc: newTx.lineItems[0]?.description,
        }),
      });
    } catch {
      // DB save failed — data is still safe in localStorage
    }
  };

  // Update status (e.g. mark settled from drawer)
  const handleUpdateStatus = (id: string, newStatus: Transaction['status']) => {
    setTransactions((prev) => {
      const updated = prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t));
      saveToLocalStorage(updated);
      return updated;
    });
    showToast(`Updated transaction status to ${newStatus}`);
  };

  // Export report action
  const handleExportReport = () => {
    // Generate CSV data for download
    const headers = 'Date,Type,Reference No,Partner,Amount,Status\n';
    const rows = transactions
      .map(
        (t) =>
          `"${t.date}","${t.type}","${t.referenceNo}","${t.partner}",${t.amount},"${t.status}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `LedgerCraft_Transactions_${selectedPeriod.replace(/[^a-zA-Z0-9]/g, '_')}_2026.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Financial report exported successfully as CSV`);
  };

  // Quick action from Sales / Purchase snapshot cards
  const handleQuickAction = (actionType: string) => {
    switch (actionType) {
      case 'New Sales Order':
        handleOpenNewTransaction('SO');
        break;
      case 'New Invoice':
        handleOpenNewTransaction('Invoice');
        break;
      case 'New Purchase Order':
        handleOpenNewTransaction('PO');
        break;
      case 'New Bill':
        handleOpenNewTransaction('Bill' as TransactionType);
        break;
      case 'Record Receipt':
        handleOpenNewTransaction('Invoice');
        break;
      case 'Record Payment':
        handleOpenNewTransaction('Bill' as TransactionType);
        break;
      default:
        handleOpenNewTransaction('SO');
    }
  };

  // Toggle skeleton loading simulation
  const handleToggleLoading = () => {
    setIsLoading(true);
    const token = localStorage.getItem('token') || '';
    setTimeout(() => {
      setIsLoading(false);
      fetchTransactionsFromApi(token);
      showToast('Loaded fresh enterprise ledger data');
    }, 1200);
  };

  return (
    <div className="relative">
      {/* Top Page Header (Spec section 1) */}
      <Header
        selectedPeriod={selectedPeriod}
        onSelectPeriod={(p) => {
          setSelectedPeriod(p);
          showToast(`Filtered report to ${p}`);
        }}
        onOpenNewTransaction={handleOpenNewTransaction}
        onExportReport={handleExportReport}
        isLoading={isLoading}
        onToggleLoading={handleToggleLoading}
        onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
      />

      {/* Main Dashboard Container: max 1440px, responsive padding */}
      <div className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-7 space-y-5 sm:space-y-6">
        {/* 2. KPI Summary Row */}
        <KpiRow kpis={kpis} isLoading={isLoading} />

        {/* 3. Sales & Purchase Snapshot (two-column row) */}
        <section aria-label="Sales and Purchase Snapshot">
          <SalesPurchaseSnapshot
            onQuickAction={handleQuickAction}
            isLoading={isLoading}
          />
        </section>

        {/* 4. Budget Reports Card (full width) */}
        <section aria-label="Budget Reports Overview">
          <BudgetCard
            onOpenReport={() => showToast('Opening comprehensive departmental budget ledger...')}
            isLoading={isLoading}
          />
        </section>

        {/* 5. Recent Activity Table (full width centerpiece) */}
        <section aria-label="Recent Activity and Operational Transactions">
          <RecentActivityTable
            transactions={transactions}
            onSelectTransaction={(tx) => setSelectedTransaction(tx)}
            onOpenNewTransaction={() => handleOpenNewTransaction('SO')}
            isLoading={isLoading}
          />
        </section>

        {/* 6. AI Insights Strip (below activity table) */}
        <AiInsightsStrip
          onReviewInsight={(insight) => setSelectedInsight(insight)}
          isLoading={isLoading}
        />
      </div>

      {/* Side Slide-Over Drawer for Transaction Details */}
      <TransactionDetailDrawer
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        onUpdateStatus={handleUpdateStatus}
      />

      {/* New Transaction Creation Modal */}
      <NewTransactionModal
        isOpen={newTxModalOpen}
        onClose={() => setNewTxModalOpen(false)}
        initialType={newTxInitialType}
        onCreateTransaction={handleCreateTransaction}
      />

      {/* AI Diagnostic Review Drawer */}
      <AiInsightDrawer
        insight={selectedInsight}
        onClose={() => setSelectedInsight(null)}
        onActionComplete={(msg) => showToast(msg)}
      />

      {/* Toast Notification Alert - Auth Brand Navy styling */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 bg-[#0B1F3A] text-white text-[13px] font-medium rounded-enterprise shadow-2xl border border-[#2563EB]/40 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="w-5 h-5 rounded-full bg-[#16A34A] flex items-center justify-center shrink-0">
            <CheckIcon size={11} className="text-white" />
          </div>
          <span className="text-slate-100">{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white"
          >
            <XIcon size={14} />
          </button>
        </div>
      )}
    </div>
  );
}