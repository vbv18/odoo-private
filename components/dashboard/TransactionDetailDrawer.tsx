'use client';

import React from 'react';
import {
  XIcon,
  DownloadIcon,
  CheckIcon,
  CalendarIcon,
  CreditCardIcon,
  FileTextIcon,
  ReceiptIcon,
} from '@/components/icons';
import { Transaction, formatCurrency } from '@/lib/dashboard-data';

interface TransactionDetailDrawerProps {
  transaction: Transaction | null;
  onClose: () => void;
  onUpdateStatus?: (id: string, newStatus: Transaction['status']) => void;
}

export function TransactionDetailDrawer({
  transaction,
  onClose,
  onUpdateStatus,
}: TransactionDetailDrawerProps) {
  if (!transaction) return null;

  const subtotal = transaction.lineItems.reduce((acc, item) => acc + item.total, 0);
  const taxEstimate = Math.round(subtotal * 0.18);
  const grandTotal = transaction.amount || (subtotal + taxEstimate);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-full sm:max-w-lg bg-white border-l border-[#E5E7EB] shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200">
          {/* Top Drawer Header */}
          <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between bg-[#F7F8FA]/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white border border-[#E5E7EB] flex items-center justify-center text-[#111827]">
                {transaction.type === 'Invoice' || transaction.type === 'SO' ? (
                  <FileTextIcon size={18} />
                ) : (
                  <ReceiptIcon size={18} />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[16px] font-semibold text-[#111827] font-mono">
                    {transaction.referenceNo}
                  </h2>
                  <span
                    className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                      transaction.status === 'Paid'
                        ? 'bg-emerald-50 text-[#16A34A] border-emerald-200'
                        : transaction.status === 'Overdue'
                        ? 'bg-rose-50 text-[#DC2626] border-rose-200'
                        : transaction.status === 'Confirmed'
                        ? 'bg-blue-50 text-[#2563EB] border-blue-200'
                        : 'bg-gray-100 text-gray-700 border-gray-200'
                    }`}
                  >
                    {transaction.status}
                  </span>
                </div>
                <p className="text-[12px] text-[#667085] mt-0.5">
                  {transaction.type} record · Recorded {transaction.date}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#667085] hover:text-[#111827] hover:bg-white rounded-md border border-transparent hover:border-[#E5E7EB] transition-colors"
              aria-label="Close detail panel"
            >
              <XIcon size={18} />
            </button>
          </div>

          {/* Drawer Body Scroll Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Amount Banner */}
            <div className="p-4 rounded-xl bg-[#F7F8FA] border border-[#E5E7EB] flex items-baseline justify-between">
              <div>
                <span className="text-[11px] font-medium text-[#667085] uppercase tracking-wider">
                  Total Transaction Value
                </span>
                <div className="text-2xl font-bold text-[#111827] tabular-nums mt-0.5">
                  {formatCurrency(grandTotal)}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-[#98A2B3] block">Due Date</span>
                <span className="text-[13px] font-medium text-[#111827]">
                  {transaction.dueDate || 'Upon Receipt'}
                </span>
              </div>
            </div>

            {/* Entity & Partner Info */}
            <div className="space-y-3">
              <h3 className="text-[12px] font-semibold text-[#667085] uppercase tracking-wider">
                Counterparty & Billing
              </h3>
              <div className="grid grid-cols-2 gap-3 text-[13px]">
                <div className="p-3 rounded-lg border border-[#E5E7EB] bg-white">
                  <span className="text-[11px] text-[#98A2B3] block">Partner</span>
                  <span className="font-semibold text-[#111827] block mt-0.5 truncate">
                    {transaction.partner}
                  </span>
                  {transaction.partnerGst && (
                    <span className="text-[11px] text-[#667085] font-mono block mt-0.5">
                      GSTIN: {transaction.partnerGst}
                    </span>
                  )}
                </div>

                <div className="p-3 rounded-lg border border-[#E5E7EB] bg-white">
                  <span className="text-[11px] text-[#98A2B3] block">General Ledger Account</span>
                  <span className="font-medium text-[#111827] block mt-0.5 truncate">
                    {transaction.account || '1001 - Primary Operating Account'}
                  </span>
                  <span className="text-[11px] text-[#667085] block mt-0.5">
                    Terms: {transaction.paymentMethod || 'Net 30 Days'}
                  </span>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-[12px] font-semibold text-[#667085] uppercase tracking-wider">
                  Line Items ({transaction.lineItems.length})
                </h3>
              </div>
              <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse text-[12px]">
                  <thead>
                    <tr className="bg-[#F7F8FA] border-b border-[#E5E7EB] text-[#667085] font-medium">
                      <th className="py-2 px-3">Item Description</th>
                      <th className="py-2 px-3 text-right">Qty</th>
                      <th className="py-2 px-3 text-right">Rate</th>
                      <th className="py-2 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {transaction.lineItems.map((item) => (
                      <tr key={item.id} className="hover:bg-[#F9FAFB]">
                        <td className="py-2.5 px-3 font-medium text-[#111827]">
                          {item.description}
                          <span className="block text-[10px] text-[#98A2B3]">GST @ {item.taxRate}%</span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-[#667085] tabular-nums">
                          {item.quantity}
                        </td>
                        <td className="py-2.5 px-3 text-right text-[#667085] tabular-nums">
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-[#111827] tabular-nums">
                          {formatCurrency(item.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Summary Breakdown */}
            <div className="bg-[#F7F8FA] p-3.5 rounded-lg border border-[#E5E7EB] space-y-2 text-[12px]">
              <div className="flex justify-between text-[#667085]">
                <span>Taxable Amount</span>
                <span className="tabular-nums font-medium text-[#111827]">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-[#667085]">
                <span>Integrated GST (18%)</span>
                <span className="tabular-nums font-medium text-[#111827]">{formatCurrency(taxEstimate)}</span>
              </div>
              <div className="pt-2 border-t border-[#E5E7EB] flex justify-between font-semibold text-[14px] text-[#111827]">
                <span>Net Payable / Balance</span>
                <span className="tabular-nums">{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            {/* Notes */}
            {transaction.notes && (
              <div className="p-3 bg-amber-50/50 border border-amber-200/60 rounded-lg">
                <span className="text-[11px] font-semibold text-amber-900 block mb-0.5">
                  Audit Notes
                </span>
                <p className="text-[12px] text-amber-900/90 leading-relaxed">
                  {transaction.notes}
                </p>
              </div>
            )}

            {/* Timeline / Audit Trail */}
            <div className="space-y-3">
              <h3 className="text-[12px] font-semibold text-[#667085] uppercase tracking-wider">
                Audit Trail & History
              </h3>
              <div className="border-l-2 border-[#E5E7EB] ml-2 space-y-4 pl-4 py-1">
                {transaction.timeline.map((item, idx) => (
                  <div key={idx} className="relative">
                    <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#16A34A] ring-4 ring-white" />
                    <p className="text-[13px] font-medium text-[#111827] leading-tight">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-[#98A2B3] mt-0.5">
                      {item.timestamp} · by {item.user}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Drawer Actions Footer */}
          <div className="p-4 border-t border-[#E5E7EB] bg-[#F7F8FA] flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => alert(`Downloading PDF statement for ${transaction.referenceNo}...`)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium text-[#111827] bg-white border border-[#E5E7EB] rounded-enterprise hover:bg-gray-50 transition-colors shadow-2xs"
            >
              <DownloadIcon size={14} className="text-[#667085]" />
              <span>Download PDF</span>
            </button>

            <div className="flex items-center gap-2">
              {transaction.status !== 'Paid' && (
                <button
                  type="button"
                  onClick={() => {
                    if (onUpdateStatus) {
                      onUpdateStatus(transaction.id, 'Paid');
                    }
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[12px] font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-enterprise transition-colors shadow-xs"
                >
                  <CheckIcon size={14} />
                  <span>Mark as Settled</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 text-[12px] font-medium text-[#667085] hover:text-[#111827] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
