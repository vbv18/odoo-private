'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/navigation/AuthContext';
import { ReceiptIcon, SearchIcon, ArrowUpRightIcon } from '@/components/icons';
import PrintInvoiceModal from '@/components/PrintInvoiceModal';

interface Bill {
  id: string;
  bill_number: string;
  bill_date: string;
  due_date: string;
  status: 'Draft' | 'Received' | 'Paid' | 'Overdue' | 'Cancelled';
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  vendor_name?: string;
  notes?: string;
}

const MOCK_BILLS: Bill[] = [
  { id: '1', bill_number: 'BILL-2026-0001', bill_date: '2026-08-05', due_date: '2026-09-05', status: 'Paid', total_amount: 28000, paid_amount: 28000, balance_due: 0, vendor_name: 'Urban Furniture Pvt Ltd', notes: 'Raw timber supply' },
  { id: '2', bill_number: 'BILL-2026-0002', bill_date: '2026-08-20', due_date: '2026-09-20', status: 'Received', total_amount: 54000, paid_amount: 0, balance_due: 54000, vendor_name: 'Urban Furniture Pvt Ltd', notes: 'Steel fittings - bulk order' },
  { id: '3', bill_number: 'BILL-2026-0003', bill_date: '2026-07-15', due_date: '2026-08-15', status: 'Overdue', total_amount: 12500, paid_amount: 0, balance_due: 12500, vendor_name: 'Urban Furniture Pvt Ltd', notes: 'Packaging materials' },
];

const STATUS_STYLES: Record<string, string> = {
  Paid: 'bg-green-50 text-green-700 border border-green-200',
  Received: 'bg-blue-50 text-[#2563EB] border border-blue-200',
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

export default function MyBillsPage() {
  const { token } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selected, setSelected] = useState<Bill | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  useEffect(() => {
    const fetchBills = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/vendor-bills', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const parsed = (data.bills || []).map((b: any) => ({
            ...b,
            total_amount: parseFloat(b.total_amount) || 0,
            paid_amount: parseFloat(b.paid_amount) || 0,
            balance_due: parseFloat(b.balance_due) || 0,
          }));
          setBills(parsed.length > 0 ? parsed : MOCK_BILLS);
        } else {
          setBills(MOCK_BILLS);
        }
      } catch {
        setBills(MOCK_BILLS);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchBills();
    else { setBills(MOCK_BILLS); setLoading(false); }
  }, [token]);

  const filtered = bills.filter((b) => {
    const matchSearch =
      b.bill_number.toLowerCase().includes(search.toLowerCase()) ||
      (b.vendor_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (b.notes || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalDue = bills
    .filter(b => b.status !== 'Paid' && b.status !== 'Cancelled')
    .reduce((s, b) => s + (parseFloat(String(b.balance_due)) || 0), 0);
  const totalPaid = bills
    .filter(b => b.status === 'Paid')
    .reduce((s, b) => s + (parseFloat(String(b.paid_amount)) || 0), 0);
  const overdueCount = bills.filter(b => b.status === 'Overdue').length;

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {/* Header */}
      <div className="bg-white border-b border-[#E5E7EB] px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
            <ReceiptIcon size={18} className="text-[#F59E0B]" />
          </div>
          <div>
            <h1 className="text-[18px] font-semibold text-[#111827]">My Bills</h1>
            <p className="text-[12px] text-[#667085]">Bills and vendor invoices for your account</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Amount Payable', value: formatINR(totalDue), color: 'text-[#F59E0B]', bg: 'bg-amber-50', border: 'border-amber-100' },
            { label: 'Total Paid', value: formatINR(totalPaid), color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-100' },
            { label: 'Overdue Bills', value: overdueCount.toString(), color: 'text-[#DC2626]', bg: 'bg-red-50', border: 'border-red-100' },
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
              placeholder="Search bills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-[13px] border border-[#E5E7EB] rounded-lg bg-white focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/20"
            />
          </div>
          <div className="flex items-center gap-2">
            {['All', 'Draft', 'Received', 'Paid', 'Overdue'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-[#F59E0B] text-white'
                    : 'bg-white border border-[#E5E7EB] text-[#667085] hover:border-[#F59E0B] hover:text-[#F59E0B]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Bills List */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-6 h-6 border-2 border-[#F59E0B] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-[13px] text-[#98A2B3] mt-3">Loading bills...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <ReceiptIcon size={36} className="text-[#E5E7EB] mx-auto mb-3" />
              <p className="text-[14px] font-medium text-[#111827]">No bills found</p>
              <p className="text-[12px] text-[#98A2B3] mt-1">No bills match your current filter</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[1fr_140px_120px_120px_100px_80px] gap-3 px-5 py-3 bg-[#F7F8FA] border-b border-[#E5E7EB] text-[11px] font-semibold uppercase tracking-wider text-[#98A2B3]">
                <span>Bill</span><span>Vendor</span><span>Date</span><span>Due Date</span><span className="text-right">Amount</span><span className="text-center">Status</span>
              </div>
              {filtered.map((bill) => (
                <div
                  key={bill.id}
                  onClick={() => setSelected(bill)}
                  className="grid grid-cols-[1fr_140px_120px_120px_100px_80px] gap-3 px-5 py-3.5 border-b border-[#F3F4F6] last:border-0 hover:bg-[#F7F8FA] cursor-pointer transition-colors group"
                >
                  <div>
                    <p className="text-[13px] font-semibold text-[#111827] group-hover:text-[#F59E0B] transition-colors">{bill.bill_number}</p>
                    {bill.notes && <p className="text-[11px] text-[#98A2B3] truncate mt-0.5">{bill.notes}</p>}
                  </div>
                  <span className="text-[12px] text-[#667085] self-center truncate">{bill.vendor_name || '—'}</span>
                  <span className="text-[12px] text-[#667085] self-center">{formatDate(bill.bill_date)}</span>
                  <span className={`text-[12px] self-center ${bill.status === 'Overdue' ? 'text-[#DC2626] font-medium' : 'text-[#667085]'}`}>
                    {formatDate(bill.due_date)}
                  </span>
                  <div className="text-right self-center">
                    <p className="text-[13px] font-semibold text-[#111827]">{formatINR(bill.total_amount)}</p>
                    {bill.balance_due > 0 && bill.status !== 'Cancelled' && (
                      <p className="text-[10px] text-[#DC2626]">Due: {formatINR(bill.balance_due)}</p>
                    )}
                  </div>
                  <div className="self-center flex justify-center">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_STYLES[bill.status]}`}>{bill.status}</span>
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
                <p className="text-[15px] font-semibold text-[#111827]">{selected.bill_number}</p>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[selected.status]}`}>{selected.status}</span>
              </div>
              <button onClick={() => setSelected(null)} className="w-7 h-7 rounded-full bg-[#F7F8FA] hover:bg-[#E5E7EB] flex items-center justify-center text-[#667085] text-lg transition-colors">×</button>
            </div>
            <div className="flex-1 p-5 space-y-4 overflow-y-auto">
              {selected.vendor_name && (
                <div className="bg-[#F7F8FA] rounded-lg p-3">
                  <p className="text-[10px] text-[#98A2B3] uppercase tracking-wider font-semibold">Vendor</p>
                  <p className="text-[14px] font-semibold text-[#111827] mt-1">{selected.vendor_name}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Bill Date', value: formatDate(selected.bill_date) },
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
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-[11px] text-amber-700 font-semibold uppercase tracking-wider">Balance Due</p>
                  <p className="text-[22px] font-bold text-[#F59E0B] mt-1">{formatINR(selected.balance_due)}</p>
                </div>
              )}
              {selected.notes && (
                <div>
                  <p className="text-[11px] text-[#98A2B3] font-semibold uppercase tracking-wider mb-1.5">Notes</p>
                  <p className="text-[13px] text-[#111827] bg-[#F7F8FA] p-3 rounded-lg">{selected.notes}</p>
                </div>
              )}

              <div className="space-y-2 pt-2">
                <button
                  onClick={() => setShowPrintModal(true)}
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-600 text-white rounded-lg text-[13px] font-semibold hover:bg-blue-700 transition-colors shadow-xs"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 6 2 18 2 18 9" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect x="6" width="12" height="8" y="14" />
                  </svg>
                  Print Vendor Bill & Voucher
                </button>

                {selected.balance_due > 0 && selected.status !== 'Cancelled' && (
                  <a
                    href="/make-payment"
                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#F59E0B] text-white rounded-lg text-[13px] font-semibold hover:bg-amber-500 transition-colors"
                  >
                    Pay Bill <ArrowUpRightIcon size={14} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Bill Modal */}
      <PrintInvoiceModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        invoice={
          selected
            ? {
                bill_number: selected.bill_number,
                bill_date: selected.bill_date,
                due_date: selected.due_date,
                vendor_name: selected.vendor_name || 'Urban Furniture Pvt Ltd',
                status: selected.status,
                total_amount: selected.total_amount,
                paid_amount: selected.paid_amount,
                balance_due: selected.balance_due,
                notes: selected.notes || `Vendor procurement bill`,
                type: 'bill',
              }
            : null
        }
      />
    </div>
  );
}
