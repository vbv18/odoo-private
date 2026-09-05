import React, { useState, useEffect } from 'react';
import { XIcon, PlusIcon } from '@/components/icons';
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync type with initialType when modal is opened
  useEffect(() => {
    if (isOpen) {
      setType(initialType);
    }
  }, [isOpen, initialType]);

  const resetForm = () => {
    setPartner('');
    setAmount('');
    setNotes('');
    setItemDesc('');
    setDueDate('2026-09-30');
    setIsSubmitting(false);
  };

  if (!isOpen) return null;

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partner || !amount || isSubmitting) return;

    setIsSubmitting(true);

    const parsedAmount = parseFloat(amount.replace(/[^0-9.]/g, '')) || 50000;
    const refPrefix = type === 'Invoice' ? 'INV' : type === 'Bill' ? 'BILL' : type === 'SO' ? 'SO' : type === 'PO' ? 'PO' : 'JE';
    const randNum = Math.floor(100 + Math.random() * 900);
    const referenceNo = `${refPrefix}-2026-${randNum}`;

    const newTx: Transaction = {
      id: `tx-new-${Date.now()}`,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
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
          user: 'You',
        },
      ],
    };

    onCreateTransaction(newTx);
    resetForm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/50 backdrop-blur-xs transition-opacity"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg max-h-[92vh] flex flex-col bg-white rounded-enterprise shadow-2xl border border-[#E5E7EB] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between bg-[#F7F8FA] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-enterprise bg-blue-50 text-[#2563EB] flex items-center justify-center border border-blue-200">
              <PlusIcon size={16} />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-[#111827]">
                Create New Transaction
              </h2>
              <p className="text-[11px] text-[#667085]">Post a financial entry to the general ledger</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-[#667085] hover:text-[#111827] hover:bg-white rounded-md transition-colors"
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Form Body Scrollable */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-[12px] font-semibold text-[#111827] mb-1.5">
              Transaction Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {(['SO', 'PO', 'Invoice', 'Bill', 'Journal'] as TransactionType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`py-1.5 px-2 rounded-enterprise text-[12px] font-semibold border transition-colors ${
                    type === t
                      ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-xs'
                      : 'bg-white text-[#667085] border-[#E5E7EB] hover:bg-[#F7F8FA]'
                  }`}
                >
                  {t === 'SO' ? 'SO' : t === 'PO' ? 'PO' : t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#111827] mb-1">
              Partner / Counterparty
            </label>
            <input
              type="text"
              required
              value={partner}
              onChange={(e) => setPartner(e.target.value)}
              placeholder="e.g. Apex Logistics or GreenLeaf Timber"
              className="w-full px-3 py-2 text-[13px] bg-white border border-[#E5E7EB] rounded-enterprise text-[#111827] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-[#111827] mb-1">
                Amount (INR ₹)
              </label>
              <input
                type="number"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="45000"
                className="w-full px-3 py-2 text-[13px] bg-white border border-[#E5E7EB] rounded-enterprise text-[#111827] tabular-nums focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#111827] mb-1">
                Settlement Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-[13px] bg-white border border-[#E5E7EB] rounded-enterprise text-[#111827] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#111827] mb-1">
              Primary Item Description
            </label>
            <input
              type="text"
              value={itemDesc}
              onChange={(e) => setItemDesc(e.target.value)}
              placeholder="e.g. 10x Ergonomic Oak Desks"
              className="w-full px-3 py-2 text-[13px] bg-white border border-[#E5E7EB] rounded-enterprise text-[#111827] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#111827] mb-1">
              Audit Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes for internal ledger clearance..."
              className="w-full px-3 py-2 text-[13px] bg-white border border-[#E5E7EB] rounded-enterprise text-[#111827] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:outline-hidden resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              className="px-3.5 py-2 text-[13px] font-medium text-[#667085] hover:text-[#111827] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-[13px] font-semibold text-white bg-[#2563EB] hover:bg-blue-700 disabled:opacity-60 rounded-enterprise transition-colors shadow-xs"
            >
              {isSubmitting ? 'Posting...' : 'Confirm & Post Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
