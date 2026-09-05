'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/navigation/AuthContext';
import { FileTextIcon, SearchIcon, CalendarIcon, ChevronDownIcon, ArrowUpRightIcon } from '@/components/icons';

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled';
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  notes?: string;
}

const MOCK_INVOICES: Invoice[] = [
  { id: '1', invoice_number: 'INV-2026-0001', invoice_date: '2026-08-01', due_date: '2026-08-31', status: 'Paid', total_amount: 45000, paid_amount: 45000, balance_due: 0, notes: 'Office furniture supply' },
  { id: '2', invoice_number: 'INV-2026-0002', invoice_date: '2026-08-15', due_date: '2026-09-15', status: 'Sent', total_amount: 72500, paid_amount: 0, balance_due: 72500, notes: 'Wooden chairs - 50 units' },
  { id: '3', invoice_number: 'INV-2026-0003', invoice_date: '2026-07-10', due_date: '2026-08-10', status: 'Overdue', total_amount: 18000, paid_amount: 0, balance_due: 18000, notes: 'Cabinet assembly' },
  { id: '4', invoice_number: 'INV-2026-0004', invoice_date: '2026-09-01', due_date: '2026-09-30', status: 'Draft', total_amount: 33000, paid_amount: 0, balance_due: 33000 },
];

const STATUS_STYLES: Record<string, string> = {
  Paid: 'bg-green-50 text-green-700 border border-green-200',
  Sent: 'bg-blue-50 text-[#2563EB] border border-blue-200',
  Overdue: 'bg-red-50 text-[#DC2626] border border-red-200',
  Draft: 'bg-gray-50 text-[#667085] border border-gray-200',
  Cancelled: 'bg-gray-50 text-[#98A2B3] border border-gray-200',
};

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}
function formatDate(d: string) {
  return d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
}

export default function MyInvoicesPage() {
  const { token, user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selected, setSelected] = useState<Invoice | null>(null);

  useEffect(() => {
    const fetchInvoices = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/customer-invoices', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setInvoices(data.invoices || MOCK_INVOICES);
        } else {
          setInvoices(MOCK_INVOICES);
        }
      } catch {
        setInvoices(MOCK_INVOICES);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchInvoices();
    else { setInvoices(MOCK_INVOICES); setLoading(false); }
  }, [token]);

  const filtered = invoices.filter((inv) => {
    const matchSearch =
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      (inv.notes || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalOutstanding = invoices.filter(i => i.status !== 'Paid' && i.status !== 'Cancelled').reduce((s, i) => s + i.balance_due, 0);
  const totalPaid = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + i.paid_amount, 0);
  const overdueCount = invoices.filter(i => i.status === 'Overdue').length;

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {/* Header */}
      <div className="bg-white border-b border-[#E5E7EB] px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
            <FileTextIcon size={18} className="text-[#2563EB]" />
          </div>
          <div>
            <h1 className="text-[18px] font-semibold text-[#111827]">My Invoices</h1>
            <p className="text-[12px] text-[#667085]">All invoices raised against your account</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Outstanding', value: formatINR(totalOutstanding), color: 'text-[#DC2626]', bg: 'bg-red-50', border: 'border-red-100' },
            { label: 'Total Paid', value: formatINR(totalPaid), color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-100' },
            { label: 'Overdue Invoices', value: overdueCount.toString(), color: 'text-[#F59E0B]', bg: 'bg-amber-50', border: 'border-amber-100' },
          ].map((card) => (
            <div key={card.label} className={`${card.bg} border ${card.border} rounded-xl p-4`}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#98A2B3]">{card.label}</p>
              <p className={`text-[22px] font-bold mt-1 ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <SearchIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
            <input
              type="text"
              placeholder="Search invoices..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-[13px] border border-[#E5E7EB] rounded-lg bg-white focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/20"
            />
          </div>
          <div className="flex items-center gap-2">
            {['All', 'Draft', 'Sent', 'Paid', 'Overdue'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-[#2563EB] text-white'
                    : 'bg-white border border-[#E5E7EB] text-[#667085] hover:border-[#2563EB] hover:text-[#2563EB]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Invoice List */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-6 h-6 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-[13px] text-[#98A2B3] mt-3">Loading invoices...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <FileTextIcon size={36} className="text-[#E5E7EB] mx-auto mb-3" />
              <p className="text-[14px] font-medium text-[#111827]">No invoices found</p>
              <p className="text-[12px] text-[#98A2B3] mt-1">No invoices match your current filter</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[1fr_120px_120px_100px_80px] gap-4 px-5 py-3 bg-[#F7F8FA] border-b border-[#E5E7EB] text-[11px] font-semibold uppercase tracking-wider text-[#98A2B3]">
                <span>Invoice</span><span>Date</span><span>Due Date</span><span className="text-right">Amount</span><span className="text-center">Status</span>
              </div>
              {filtered.map((inv) => (
                <div
                  key={inv.id}
                  onClick={() => setSelected(inv)}
                  className="grid grid-cols-[1fr_120px_120px_100px_80px] gap-4 px-5 py-3.5 border-b border-[#F3F4F6] last:border-0 hover:bg-[#F7F8FA] cursor-pointer transition-colors group"
                >
                  <div>
                    <p className="text-[13px] font-semibold text-[#111827] group-hover:text-[#2563EB] transition-colors">{inv.invoice_number}</p>
                    {inv.notes && <p className="text-[11px] text-[#98A2B3] truncate mt-0.5">{inv.notes}</p>}
                  </div>
                  <span className="text-[12px] text-[#667085] self-center">{formatDate(inv.invoice_date)}</span>
                  <span className={`text-[12px] self-center ${inv.status === 'Overdue' ? 'text-[#DC2626] font-medium' : 'text-[#667085]'}`}>
                    {formatDate(inv.due_date)}
                  </span>
                  <div className="text-right self-center">
                    <p className="text-[13px] font-semibold text-[#111827]">{formatINR(inv.total_amount)}</p>
                    {inv.balance_due > 0 && inv.status !== 'Cancelled' && (
                      <p className="text-[10px] text-[#DC2626]">Due: {formatINR(inv.balance_due)}</p>
                    )}
                  </div>
                  <div className="self-center flex justify-center">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_STYLES[inv.status]}`}>{inv.status}</span>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30" onClick={() => setSelected(null)} />
          <div className="w-[400px] bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB]">
              <div>
                <p className="text-[15px] font-semibold text-[#111827]">{selected.invoice_number}</p>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[selected.status]}`}>{selected.status}</span>
              </div>
              <button onClick={() => setSelected(null)} className="w-7 h-7 rounded-full bg-[#F7F8FA] hover:bg-[#E5E7EB] flex items-center justify-center text-[#667085] text-lg transition-colors">×</button>
            </div>
            <div className="flex-1 p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Invoice Date', value: formatDate(selected.invoice_date) },
                  { label: 'Due Date', value: formatDate(selected.due_date) },
                  { label: 'Total Amount', value: formatINR(selected.total_amount) },
                  { label: 'Paid Amount', value: formatINR(selected.paid_amount) },
                ].map((f) => (
                  <div key={f.label} className="bg-[#F7F8FA] rounded-lg p-3">
                    <p className="text-[10px] text-[#98A2B3] uppercase tracking-wider font-semibold">{f.label}</p>
                    <p className="text-[14px] font-semibold text-[#111827] mt-1">{f.value}</p>
                  </div>
                ))}
              </div>
              {selected.balance_due > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-[11px] text-red-600 font-semibold uppercase tracking-wider">Balance Due</p>
                  <p className="text-[22px] font-bold text-[#DC2626] mt-1">{formatINR(selected.balance_due)}</p>
                </div>
              )}
              {selected.notes && (
                <div>
                  <p className="text-[11px] text-[#98A2B3] font-semibold uppercase tracking-wider mb-1.5">Notes</p>
                  <p className="text-[13px] text-[#111827] bg-[#F7F8FA] p-3 rounded-lg">{selected.notes}</p>
                </div>
              )}
              {selected.balance_due > 0 && selected.status !== 'Cancelled' && (
                <a
                  href="/make-payment"
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#2563EB] text-white rounded-lg text-[13px] font-semibold hover:bg-blue-700 transition-colors mt-2"
                >
                  Pay Now <ArrowUpRightIcon size={14} />
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
