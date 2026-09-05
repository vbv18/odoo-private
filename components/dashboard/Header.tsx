'use client';

import React, { useState } from 'react';
import {
  CalendarIcon,
  ChevronDownIcon,
  DownloadIcon,
  PlusIcon,
  FileTextIcon,
  ReceiptIcon,
  RefreshCwIcon,
  MenuIcon,
} from '@/components/icons';
import { TransactionType } from '@/lib/dashboard-data';

interface HeaderProps {
  selectedPeriod: string;
  onSelectPeriod: (period: string) => void;
  onOpenNewTransaction: (type?: TransactionType) => void;
  onExportReport: () => void;
  isLoading: boolean;
  onToggleLoading: () => void;
  onOpenMobileSidebar: () => void;
}

export function Header({
  selectedPeriod,
  onSelectPeriod,
  onOpenNewTransaction,
  onExportReport,
  isLoading,
  onToggleLoading,
  onOpenMobileSidebar,
}: HeaderProps) {
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [newTransDropdownOpen, setNewTransDropdownOpen] = useState(false);

  const periods = [
    { label: 'This Month (September 2026)', value: 'This Month' },
    { label: 'Last Month (August 2026)', value: 'Last Month' },
    { label: 'Current Quarter (Q3 2026)', value: 'Current Quarter' },
    { label: 'Fiscal Year 2026-27 YTD', value: 'Fiscal Year' },
    { label: 'Custom Date Range...', value: 'Custom' },
  ];

  return (
    <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-30 px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
        {/* Left Title & Context */}
        <div>
          {/* Workspace context & Mobile Hamburger */}
          <div className="flex items-center gap-2 mb-1">
            <button
              type="button"
              onClick={onOpenMobileSidebar}
              className="p-2 -ml-1 text-[#667085] hover:text-[#111827] rounded-enterprise hover:bg-[#F7F8FA] lg:hidden transition-colors flex items-center justify-center min-h-[38px] min-w-[38px]"
              aria-label="Open navigation menu"
            >
              <MenuIcon size={20} />
            </button>
            <span className="text-[12px] font-medium text-[#667085] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
              Urban Furniture · September 2026
            </span>
          </div>

          <h1 className="text-2xl sm:text-[26px] font-bold text-[#111827] tracking-tight leading-tight">
            Dashboard
          </h1>
          <p className="text-[13px] text-[#667085] mt-0.5">
            Financial operations, ledger summary, and performance metrics.
          </p>
        </div>

        {/* Right Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Skeleton loading toggle */}
          <button
            type="button"
            onClick={onToggleLoading}
            className={`inline-flex items-center gap-1.5 px-2.5 py-2 text-[12px] font-medium rounded-enterprise border transition-colors ${
              isLoading
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-white text-[#667085] border-[#E5E7EB] hover:bg-[#F7F8FA] hover:text-[#111827]'
            }`}
            title="Toggle skeleton loading state"
          >
            <RefreshCwIcon size={13} className={isLoading ? 'animate-spin text-amber-600' : ''} />
            <span className="hidden sm:inline">{isLoading ? 'Simulating Load' : 'Test Skeleton'}</span>
          </button>

          {/* Date Range Selector Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setDateDropdownOpen(!dateDropdownOpen);
                setNewTransDropdownOpen(false);
              }}
              className="inline-flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-[#111827] bg-white border border-[#E5E7EB] rounded-enterprise hover:bg-[#F7F8FA] transition-colors focus:ring-2 focus:ring-[#2563EB]/20"
              aria-expanded={dateDropdownOpen}
            >
              <CalendarIcon size={14} className="text-[#667085]" />
              <span className="truncate max-w-[140px] sm:max-w-none">{selectedPeriod}</span>
              <ChevronDownIcon size={13} className="text-[#667085] ml-0.5 shrink-0" />
            </button>

            {dateDropdownOpen && (
              <div className="absolute right-0 mt-1 w-64 max-w-[calc(100vw-2rem)] bg-white rounded-enterprise shadow-xl border border-[#E5E7EB] py-1 z-40 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-[11px] font-semibold uppercase text-[#98A2B3] tracking-wider border-b border-[#E5E7EB]">
                  Filter Reporting Period
                </div>
                {periods.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => {
                      onSelectPeriod(p.value);
                      setDateDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-[13px] hover:bg-[#F7F8FA] transition-colors flex items-center justify-between ${
                      selectedPeriod === p.value ? 'font-semibold text-[#2563EB] bg-blue-50/70' : 'text-[#111827]'
                    }`}
                  >
                    <span>{p.label}</span>
                    {selectedPeriod === p.value && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Export Report Secondary Action */}
          <button
            type="button"
            onClick={onExportReport}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-[#111827] bg-white border border-[#E5E7EB] rounded-enterprise hover:bg-[#F7F8FA] hover:border-gray-300 transition-colors shadow-2xs"
          >
            <DownloadIcon size={14} className="text-[#667085]" />
            <span className="hidden sm:inline">Export Report</span>
            <span className="sm:hidden">Export</span>
          </button>

          {/* New Transaction Dropdown - Uses Auth Primary Brand Blue #2563EB */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setNewTransDropdownOpen(!newTransDropdownOpen);
                setDateDropdownOpen(false);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1D4ED8] rounded-enterprise transition-all shadow-xs"
              aria-expanded={newTransDropdownOpen}
            >
              <PlusIcon size={15} />
              <span>New Transaction</span>
              <ChevronDownIcon size={13} className="text-blue-100 ml-0.5" />
            </button>

            {newTransDropdownOpen && (
              <div className="absolute right-0 mt-1 w-56 max-w-[calc(100vw-2rem)] bg-white rounded-enterprise shadow-xl border border-[#E5E7EB] py-1 z-40 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-[11px] font-semibold uppercase text-[#98A2B3] tracking-wider border-b border-[#E5E7EB]">
                  Create Record
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onOpenNewTransaction('SO');
                    setNewTransDropdownOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2.5 text-[13px] text-[#111827] hover:bg-[#F7F8FA] transition-colors flex items-center gap-2.5"
                >
                  <div className="w-7 h-7 rounded-md bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0">
                    <FileTextIcon size={14} />
                  </div>
                  <div>
                    <p className="font-semibold leading-tight">Sales Order</p>
                    <p className="text-[11px] text-[#667085]">Customer quote or order</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onOpenNewTransaction('PO');
                    setNewTransDropdownOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2.5 text-[13px] text-[#111827] hover:bg-[#F7F8FA] transition-colors flex items-center gap-2.5"
                >
                  <div className="w-7 h-7 rounded-md bg-emerald-50 text-[#16A34A] flex items-center justify-center shrink-0">
                    <ReceiptIcon size={14} />
                  </div>
                  <div>
                    <p className="font-semibold leading-tight">Purchase Order</p>
                    <p className="text-[11px] text-[#667085]">Vendor bill or PO request</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onOpenNewTransaction('Journal');
                    setNewTransDropdownOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2.5 text-[13px] text-[#111827] hover:bg-[#F7F8FA] transition-colors flex items-center gap-2.5"
                >
                  <div className="w-7 h-7 rounded-md bg-purple-50 text-[#7C3AED] flex items-center justify-center shrink-0">
                    <CalendarIcon size={14} />
                  </div>
                  <div>
                    <p className="font-semibold leading-tight">Journal Entry</p>
                    <p className="text-[11px] text-[#667085]">Manual debit & credit line</p>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
