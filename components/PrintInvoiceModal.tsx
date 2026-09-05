'use client';

import React from 'react';
import { LogoIcon } from './icons';

interface PrintInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: {
    invoice_number?: string;
    bill_number?: string;
    type?: 'invoice' | 'bill';
    invoice_date?: string;
    bill_date?: string;
    due_date?: string | null;
    customer_name?: string | null;
    vendor_name?: string | null;
    customer_email?: string | null;
    vendor_email?: string | null;
    customer_address?: string | null;
    vendor_address?: string | null;
    status: string;
    subtotal?: number | string | null;
    tax_amount?: number | string | null;
    total_amount: number | string;
    paid_amount?: number | string | null;
    balance_due?: number | string | null;
    notes?: string | null;
    payment_ref?: string | null;
    payment_method?: string | null;
    items?: Array<{
      description: string;
      quantity: number;
      unit_price: number;
      tax_rate?: number;
    }>;
  } | null;
}

function formatINR(val: any): string {
  const n = parseFloat(String(val || 0));
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(isNaN(n) ? 0 : n);
}

function formatDate(d?: string): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
}

export default function PrintInvoiceModal({ isOpen, onClose, invoice }: PrintInvoiceModalProps) {
  if (!isOpen || !invoice) return null;

  const isBill = invoice.type === 'bill' || !!invoice.bill_number || (!!invoice.invoice_number && invoice.invoice_number.startsWith('BILL-'));
  const docNumber = invoice.bill_number || invoice.invoice_number || 'DOC-0001';
  const docDate = invoice.bill_date || invoice.invoice_date || '';
  const partnerName = (isBill ? invoice.vendor_name : invoice.customer_name) || (isBill ? 'Urban Furniture Vendor' : 'Urban Furniture Client');
  const partnerEmail = isBill ? (invoice.vendor_email || '') : (invoice.customer_email || '');
  const partnerAddress = isBill ? (invoice.vendor_address || '') : (invoice.customer_address || '');
  const badgeText = isBill ? 'VENDOR BILL / VOUCHER' : 'TAX INVOICE';
  const modalTitle = isBill ? `Vendor Bill & Payment Voucher — ${docNumber}` : `Tax Invoice & Payment Receipt — ${docNumber}`;

  const total = parseFloat(String(invoice.total_amount || 0));
  const subtotal = invoice.subtotal !== undefined ? parseFloat(String(invoice.subtotal)) : Number((total / 1.18).toFixed(2));
  const tax = invoice.tax_amount !== undefined ? parseFloat(String(invoice.tax_amount)) : Number((total - subtotal).toFixed(2));
  const paid = invoice.paid_amount !== undefined ? parseFloat(String(invoice.paid_amount)) : (invoice.status === 'Paid' ? total : 0);
  const balance = invoice.balance_due !== undefined ? parseFloat(String(invoice.balance_due)) : Math.max(0, total - paid);

  const items = invoice.items && invoice.items.length > 0 ? invoice.items : [
    {
      description: invoice.notes || (isBill ? 'Raw Materials & Vendor Procurement Supply' : 'Goods & Professional Services Supply'),
      quantity: 1,
      unit_price: subtotal,
      tax_rate: 18,
    }
  ];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      {/* Print CSS styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-invoice-content, #printable-invoice-content * {
            visibility: visible;
          }
          #printable-invoice-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 24px;
            background: white !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print-area {
            display: none !important;
          }
        }
      `}</style>

      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Modal Toolbar (hidden when printing) */}
        <div className="no-print-area px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
            <p className="text-sm font-semibold text-gray-800">
              {modalTitle}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 flex items-center justify-center text-base font-bold transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Invoice / Bill Printable Area */}
        <div className="p-8 overflow-y-auto bg-white" id="printable-invoice-content">
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-gray-800 pb-6 mb-6">
            <div>
              <div className="flex items-center gap-2.5">
                <LogoIcon size={32} />
                <span className="text-2xl font-black tracking-tight text-gray-900">LedgerCraft</span>
              </div>
              <p className="text-sm font-bold text-gray-800 mt-1">Urban Furniture Pvt Ltd</p>
              <p className="text-xs text-gray-600 mt-0.5">Plot 42, Industrial Area, Andheri East, Mumbai 400093</p>
              <p className="text-xs text-gray-600">GSTIN: 27AABCL1234F1Z8 · support@ledgercraft.in</p>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-gray-900 text-white font-mono text-xs font-bold uppercase tracking-widest rounded">
                {badgeText}
              </span>
              <p className="text-xl font-extrabold text-gray-900 mt-2">{docNumber}</p>
              <p className="text-xs text-gray-600 mt-1">
                Date: <strong className="text-gray-800">{formatDate(docDate)}</strong>
              </p>
              {invoice.due_date && (
                <p className="text-xs text-gray-600">
                  Due: <strong className="text-gray-800">{formatDate(invoice.due_date)}</strong>
                </p>
              )}
            </div>
          </div>

          {/* Billed To / Vendor & Payment Details */}
          <div className="grid grid-cols-2 gap-6 bg-gray-50 border border-gray-200 rounded-xl p-5 mb-6 text-xs">
            <div>
              <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px] block mb-1">
                {isBill ? 'Vendor Details (Payee)' : 'Billed To (Customer)'}
              </span>
              <p className="text-sm font-bold text-gray-900">{partnerName}</p>
              {partnerEmail && <p className="text-gray-600 mt-0.5">{partnerEmail}</p>}
              {partnerAddress && <p className="text-gray-600 mt-0.5">{partnerAddress}</p>}
            </div>
            <div className="space-y-1.5 border-l border-gray-200 pl-6">
              <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px] block mb-1">
                Payment Record Status
              </span>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Payment Status:</span>
                <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                  invoice.status === 'Paid' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}>
                  {invoice.status.toUpperCase()}
                </span>
              </div>
              {invoice.payment_ref && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Payment Ref:</span>
                  <span className="font-mono font-semibold text-gray-800">{invoice.payment_ref}</span>
                </div>
              )}
              {invoice.payment_method && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Payment Method:</span>
                  <span className="font-semibold text-gray-800">{invoice.payment_method}</span>
                </div>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden mb-6">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-200 text-gray-700 font-bold uppercase text-[10px] tracking-wider text-left">
                <th className="py-2.5 px-4 w-12 text-center">#</th>
                <th className="py-2.5 px-4">Item Description</th>
                <th className="py-2.5 px-4 text-center w-20">Qty</th>
                <th className="py-2.5 px-4 text-right w-28">Unit Price</th>
                <th className="py-2.5 px-4 text-right w-20">GST</th>
                <th className="py-2.5 px-4 text-right w-28">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((item, idx) => {
                const lineTotal = (item.quantity || 1) * (item.unit_price || 0);
                return (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-center text-gray-500 font-mono">{idx + 1}</td>
                    <td className="py-3 px-4 font-medium text-gray-900">{item.description}</td>
                    <td className="py-3 px-4 text-center text-gray-700">{item.quantity || 1}</td>
                    <td className="py-3 px-4 text-right text-gray-700">{formatINR(item.unit_price)}</td>
                    <td className="py-3 px-4 text-right text-gray-700">{item.tax_rate || 18}%</td>
                    <td className="py-3 px-4 text-right font-semibold text-gray-900">{formatINR(lineTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Totals Summary */}
          <div className="flex justify-end mb-8">
            <div className="w-72 bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span className="font-semibold text-gray-900">{formatINR(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>CGST (9%):</span>
                <span className="font-semibold text-gray-900">{formatINR(tax / 2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>SGST (9%):</span>
                <span className="font-semibold text-gray-900">{formatINR(tax / 2)}</span>
              </div>
              <div className="border-t border-gray-300 pt-2 flex justify-between text-sm font-bold text-gray-900">
                <span>Total Amount:</span>
                <span className="text-blue-600 text-base">{formatINR(total)}</span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between text-xs font-semibold text-green-700">
                <span>Paid Amount:</span>
                <span>{formatINR(paid)}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-gray-800">
                <span>Balance Due:</span>
                <span className={balance > 0 ? 'text-red-600' : 'text-green-600'}>{formatINR(balance)}</span>
              </div>
            </div>
          </div>

          {/* Notes & Footer */}
          {invoice.notes && (
            <div className="mb-6 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-900">
              <span className="font-bold">Remarks: </span>
              {invoice.notes}
            </div>
          )}

          <div className="border-t border-gray-200 pt-6 flex items-end justify-between text-xs text-gray-500">
            <div>
              <p className="font-semibold text-gray-700">Terms & Conditions:</p>
              <p>• Computer-generated tax invoice and payment settlement voucher.</p>
              <p>• No physical signature required under IT Act 2000.</p>
            </div>
            <div className="text-center">
              <div className="w-36 border-b border-gray-400 mb-1" />
              <p className="font-bold text-gray-700">Authorized Signatory</p>
              <p className="text-[10px] text-gray-500">Urban Furniture Pvt Ltd</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
