import React from 'react';
import Link from 'next/link';
import { PlusIcon, ArrowRightIcon } from '@/components/icons';
import { SALES_METRICS, PURCHASE_METRICS } from '@/lib/dashboard-data';

interface SnapshotProps {
  onQuickAction: (actionType: string) => void;
  isLoading?: boolean;
}

export function SalesPurchaseSnapshot({ onQuickAction, isLoading }: SnapshotProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white border border-[#E5E7EB] rounded-enterprise p-5 space-y-4 animate-pulse">
            <div className="flex justify-between items-center">
              <div className="h-5 w-24 bg-gray-200 rounded-sm" />
              <div className="h-4 w-16 bg-gray-200 rounded-sm" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="h-12 bg-gray-100 rounded-enterprise" />
              <div className="h-12 bg-gray-100 rounded-enterprise" />
            </div>
            <div className="h-2.5 bg-gray-200 rounded-full" />
            <div className="flex gap-2 pt-2">
              <div className="h-7 w-28 bg-gray-100 rounded-md" />
              <div className="h-7 w-24 bg-gray-100 rounded-md" />
              <div className="h-7 w-24 bg-gray-100 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* SALES CARD */}
      <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-5 flex flex-col justify-between hover:shadow-xs transition-shadow min-h-[380px]">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#F0F2F5]">
            <div className="flex items-center gap-2.5">
              <h2 className="text-[17px] font-semibold text-[#111827]">
                Sales
              </h2>
              <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-blue-50 text-[#2563EB] border border-blue-200">
                FY 2026 Sep
              </span>
            </div>
            <Link
              href="/dashboard#sales-all"
              className="text-[12px] font-medium text-[#2563EB] hover:text-blue-700 hover:underline inline-flex items-center gap-1 group"
            >
              <span>View all</span>
              <ArrowRightIcon size={11} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          {/* Stat blocks side-by-side (responsive stack on mobile) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 my-5">
            {/* Confirmed */}
            <div className="p-4 rounded-enterprise bg-[#F7F8FA] border border-[#E5E7EB]/80 min-h-[100px] flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-medium text-[#667085] uppercase tracking-wider">
                  Confirmed
                </span>
                <span className="text-[11px] font-semibold text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {SALRICS_PERCENT(SALES_METRICS.confirmed.percentage)}
                </span>
              </div>
              <div className="mt-auto">
                <div className="text-[22px] sm:text-[24px] font-semibold text-[#111827] tabular-nums leading-none">
                  {SALES_METRICS.confirmed.formatted}
                </div>
                <p className="text-[12px] text-[#98A2B3] mt-1.5">
                  {SALES_METRICS.confirmed.count} confirmed orders
                </p>
              </div>
            </div>

            {/* Draft */}
            <div className="p-4 rounded-enterprise bg-[#F7F8FA] border border-[#E5E7EB]/80 min-h-[100px] flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-medium text-[#667085] uppercase tracking-wider">
                  Draft
                </span>
                <span className="text-[11px] font-medium text-[#667085] bg-gray-200/70 px-2 py-0.5 rounded">
                  {SALRICS_PERCENT(SALES_METRICS.draft.percentage)}
                </span>
              </div>
              <div className="mt-auto">
                <div className="text-[22px] sm:text-[24px] font-semibold text-[#111827] tabular-nums leading-none">
                  {SALES_METRICS.draft.formatted}
                </div>
                <p className="text-[12px] text-[#98A2B3] mt-1.5">
                  {SALES_METRICS.draft.count} pending quotes
                </p>
              </div>
            </div>
          </div>

          {/* Horizontal bar breakdown */}
          <div className="space-y-2 mb-5">
            <div className="flex items-center justify-between text-[12px] text-[#667085]">
              <span>Breakdown by Stage</span>
              <span className="font-semibold text-[#111827]">Total: ₹7,57,000</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-[#E5E7EB] overflow-hidden flex">
              <div
                className="bg-[#2563EB] h-full transition-all duration-500"
                style={{ width: `${SALES_METRICS.confirmed.percentage}%` }}
                title={`Confirmed: ${SALES_METRICS.confirmed.percentage}%`}
              />
              <div
                className="bg-[#98A2B3] h-full transition-all duration-500"
                style={{ width: `${SALES_METRICS.draft.percentage}%` }}
                title={`Draft: ${SALES_METRICS.draft.percentage}%`}
              />
            </div>
            <div className="flex items-center gap-4 text-[11px] text-[#667085] pt-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
                <span>Confirmed ({SALES_METRICS.confirmed.percentage}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#98A2B3]" />
                <span>Draft ({SALES_METRICS.draft.percentage}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick action row */}
        <div className="pt-4 border-t border-[#F0F2F5] flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => onQuickAction('New Sales Order')}
            className="px-3 py-2 rounded-enterprise border border-[#E5E7EB] bg-white text-[12px] font-medium text-[#111827] hover:bg-[#F7F8FA] hover:border-gray-300 transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <PlusIcon size={12} className="text-[#667085]" />
            <span>New Sales Order</span>
          </button>
          <button
            type="button"
            onClick={() => onQuickAction('New Invoice')}
            className="px-3 py-2 rounded-enterprise border border-[#E5E7EB] bg-white text-[12px] font-medium text-[#111827] hover:bg-[#F7F8FA] hover:border-gray-300 transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <PlusIcon size={12} className="text-[#667085]" />
            <span>New Invoice</span>
          </button>
          <button
            type="button"
            onClick={() => onQuickAction('Record Receipt')}
            className="px-3 py-2 rounded-enterprise border border-[#E5E7EB] bg-white text-[12px] font-medium text-[#111827] hover:bg-[#F7F8FA] hover:border-gray-300 transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <span>Record Receipt</span>
          </button>
        </div>
      </div>

      {/* PURCHASE CARD */}
      <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-5 flex flex-col justify-between hover:shadow-xs transition-shadow min-h-[380px]">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#F0F2F5]">
            <div className="flex items-center gap-2.5">
              <h2 className="text-[17px] font-semibold text-[#111827]">
                Purchase
              </h2>
              <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-slate-100 text-[#475569] border border-slate-200">
                FY 2026 Sep
              </span>
            </div>
            <Link
              href="/dashboard#purchases-all"
              className="text-[12px] font-medium text-[#2563EB] hover:text-blue-700 hover:underline inline-flex items-center gap-1 group"
            >
              <span>View all</span>
              <ArrowRightIcon size={11} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          {/* Stat blocks side-by-side (responsive stack on mobile) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 my-5">
            {/* Confirmed */}
            <div className="p-4 rounded-enterprise bg-[#F7F8FA] border border-[#E5E7EB]/80 min-h-[100px] flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-medium text-[#667085] uppercase tracking-wider">
                  Confirmed
                </span>
                <span className="text-[11px] font-semibold text-[#15803D] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {SALRICS_PERCENT(PURCHASE_METRICS.confirmed.percentage)}
                </span>
              </div>
              <div className="mt-auto">
                <div className="text-[22px] sm:text-[24px] font-semibold text-[#111827] tabular-nums leading-none">
                  {PURCHASE_METRICS.confirmed.formatted}
                </div>
                <p className="text-[12px] text-[#98A2B3] mt-1.5">
                  {PURCHASE_METRICS.confirmed.count} active vendor bills
                </p>
              </div>
            </div>

            {/* Draft */}
            <div className="p-4 rounded-enterprise bg-[#F7F8FA] border border-[#E5E7EB]/80 min-h-[100px] flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-medium text-[#667085] uppercase tracking-wider">
                  Draft
                </span>
                <span className="text-[11px] font-medium text-[#667085] bg-gray-200/70 px-2 py-0.5 rounded">
                  {SALRICS_PERCENT(PURCHASE_METRICS.draft.percentage)}
                </span>
              </div>
              <div className="mt-auto">
                <div className="text-[22px] sm:text-[24px] font-semibold text-[#111827] tabular-nums leading-none">
                  {PURCHASE_METRICS.draft.formatted}
                </div>
                <p className="text-[12px] text-[#98A2B3] mt-1.5">
                  {PURCHASE_METRICS.draft.count} draft purchase orders
                </p>
              </div>
            </div>
          </div>

          {/* Horizontal bar breakdown */}
          <div className="space-y-2 mb-5">
            <div className="flex items-center justify-between text-[12px] text-[#667085]">
              <span>Breakdown by Stage</span>
              <span className="font-semibold text-[#111827]">Total: ₹4,52,700</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-[#E5E7EB] overflow-hidden flex">
              <div
                className="bg-[#15803D] h-full transition-all duration-500"
                style={{ width: `${PURCHASE_METRICS.confirmed.percentage}%` }}
                title={`Confirmed: ${PURCHASE_METRICS.confirmed.percentage}%`}
              />
              <div
                className="bg-[#98A2B3] h-full transition-all duration-500"
                style={{ width: `${PURCHASE_METRICS.draft.percentage}%` }}
                title={`Draft: ${PURCHASE_METRICS.draft.percentage}%`}
              />
            </div>
            <div className="flex items-center gap-4 text-[11px] text-[#667085] pt-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#15803D]" />
                <span>Confirmed ({PURCHASE_METRICS.confirmed.percentage}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#98A2B3]" />
                <span>Draft ({PURCHASE_METRICS.draft.percentage}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick action row */}
        <div className="pt-4 border-t border-[#F0F2F5] flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => onQuickAction('New Purchase Order')}
            className="px-3 py-2 rounded-enterprise border border-[#E5E7EB] bg-white text-[12px] font-medium text-[#111827] hover:bg-[#F7F8FA] hover:border-gray-300 transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <PlusIcon size={12} className="text-[#667085]" />
            <span>New Purchase Order</span>
          </button>
          <button
            type="button"
            onClick={() => onQuickAction('New Bill')}
            className="px-3 py-2 rounded-enterprise border border-[#E5E7EB] bg-white text-[12px] font-medium text-[#111827] hover:bg-[#F7F8FA] hover:border-gray-300 transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <PlusIcon size={12} className="text-[#667085]" />
            <span>New Bill</span>
          </button>
          <button
            type="button"
            onClick={() => onQuickAction('Record Payment')}
            className="px-3 py-2 rounded-enterprise border border-[#E5E7EB] bg-white text-[12px] font-medium text-[#111827] hover:bg-[#F7F8FA] hover:border-gray-300 transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <span>Record Payment</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function SALRICS_PERCENT(pct: number): string {
  return `${pct.toFixed(1)}%`;
}
