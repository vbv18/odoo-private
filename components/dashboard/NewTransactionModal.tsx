'use client';

import React, { useState } from 'react';
import { XIcon, PlusIcon, FileTextIcon } from '@/components/icons';
import { Transaction, TransactionType } from '@/lib/dashboard-data';

interface NewTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: TransactionType;
  onCreateTransaction: (newTx: Transaction) => void;
}

export function NewTransactionModal({
  isOpen,
  onClose,
  initialType = 'SO',
  onCreateTransaction,
}: NewTransactionModalProps) {
  const [type, setType] = useState<TransactionType>(initialType);
  const [partner, setPartner] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [dueDate, setDueDate] = useState('2026-09-30');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partner || !amount) return;

    const parsedAmount = parseFloat(amount.replace(/[^0-9.]/g, '')) || 50000;
    const refPrefix = type === 'Invoice' ? 'INV' : type === 'Bill' ? 'BILL' : type === 'SO' ? 'SO' : type === 'PO' ? 'PO' : 'JE';
    const randNum = Math.floor(100 + Math.random() * 900);
    const referenceNo = `${refPrefix}-2026-${randNum}`;

    const newTx: Transaction = {
      id: `tx-new-${Date.now()}`,
      date: '05 Sep 2026',
      type,
      referenceNo,
      partner,
      amount: parsedAmount,
      status: 'Confirmed',
      dueDate,
      notes: notes || 'Created via LedgerCraft Enterprise Dashboard',
      lineItems: [
        {
          id: `li-${Date.now()}`,
          description: itemDesc || `${type} Contract Work Items`,
          quantity: 1,
          unitPrice: parsedAmount,
          taxRate: 18,
          total: parsedAmount,
        },
      ],
      timeline: [
        {
          title: `${type} record created`,
          timestamp: 'Just now',
          user: 'Vaibhav K.',
        },
      ],
    };

    onCreateTransaction(newTx);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-[#E5E7EB] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between bg-[#F7F8FA]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-[#16A34A]/10 text-[#16A34A] flex items-center justify-center">
              <PlusIcon size={16} />
            </div>
            <h2 className="text-[15px] font-semibold text-[#111827]">
              Create New Transaction
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#667085] hover:text-[#111827] rounded-md transition-colors"
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-[#111827] mb-1">
              Transaction Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['SO', 'PO', 'Invoice', 'Bill', 'Journal'] as TransactionType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`py-1.5 px-2 rounded-lg text-[12px] font-medium border transition-colors ${
                    type === t
                      ? 'bg-[#16A34A] text-white border-[#16A34A]'
                      : 'bg-white text-[#667085] border-[#E5E7EB] hover:bg-[#F7F8FA]'
                  }`}
                >
                  {t === 'SO' ? 'Sales Order' : t === 'PO' ? 'Purchase Order' : t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#111827] mb-1">
              Partner / Counterparty
            </label>
            <input
              type="text"
              required
              value={partner}
              onChange={(e) => setPartner(e.target.value)}
              placeholder="e.g. Apex Logistics or GreenLeaf Timber"
              className="w-full px-3 py-2 text-[13px] bg-white border border-[#E5E7EB] rounded-lg text-[#111827] focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-[#111827] mb-1">
                Amount (INR ₹)
              </label>
              <input
                type="number"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="45000"
                className="w-full px-3 py-2 text-[13px] bg-white border border-[#E5E7EB] rounded-lg text-[#111827] tabular-nums focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#111827] mb-1">
                Settlement Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-[13px] bg-white border border-[#E5E7EB] rounded-lg text-[#111827] focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#111827] mb-1">
              Primary Item Description
            </label>
            <input
              type="text"
              value={itemDesc}
              onChange={(e) => setItemDesc(e.target.value)}
              placeholder="e.g. 10x Ergonomic Oak Desks"
              className="w-full px-3 py-2 text-[13px] bg-white border border-[#E5E7EB] rounded-lg text-[#111827] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#111827] mb-1">
              Audit Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes for internal ledger clearance..."
              className="w-full px-3 py-2 text-[13px] bg-white border border-[#E5E7EB] rounded-lg text-[#111827] focus:outline-hidden resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-[13px] font-medium text-[#667085] hover:text-[#111827] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-[13px] font-semibold text-white bg-[#16A34A] hover:bg-[#15803D] rounded-lg transition-colors shadow-xs"
            >
              Confirm & Post Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
