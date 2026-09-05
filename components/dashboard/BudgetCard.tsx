import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRightIcon, CalendarIcon, ChevronDownIcon } from '@/components/icons';
import {
  BUDGET_METRICS,
  BUDGET_RECORDS,
  formatCurrency,
} from '@/lib/dashboard-data';

interface BudgetCardProps {
  onOpenReport?: () => void;
  isLoading?: boolean;
}

export function BudgetCard({ onOpenReport, isLoading }: BudgetCardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('September 2026');
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false);

  const periods = ['September 2026', 'August 2026', 'Q3 2026', 'FY 2026-27'];

  if (isLoading) {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-5 space-y-4 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-5 w-32 bg-gray-200 rounded-sm" />
          <div className="h-4 w-28 bg-gray-200 rounded-sm" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-16 bg-gray-100 rounded-enterprise" />
          <div className="h-16 bg-gray-100 rounded-enterprise" />
          <div className="h-16 bg-gray-100 rounded-enterprise" />
        </div>
        <div className="h-40 bg-gray-100 rounded-enterprise" />
      </div>
    );
  }

  // Donut chart calculations
  const totalBudget = BUDGET_METRICS.committed.amount;
  const achievedAmount = BUDGET_METRICS.achieved.amount;
  const achievedPercent = (achievedAmount / totalBudget) * 100;
  const remainingPercent = Math.max(0, 100 - achievedPercent);

  // SVG circle geometry
  const size = 130;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (achievedPercent / 100) * circumference;

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-5 shadow-2xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F0F2F5]">
        <div className="flex items-center gap-3">
          <h2 className="text-[16px] font-semibold text-[#111827]">
            Budget Reports
          </h2>

          {/* Period selector dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setPeriodDropdownOpen(!periodDropdownOpen)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-medium text-[#111827] bg-[#F7F8FA] border border-[#E5E7EB] rounded-enterprise hover:bg-gray-100 transition-colors"
            >
              <CalendarIcon size={12} className="text-[#667085]" />
              <span>{selectedPeriod}</span>
              <ChevronDownIcon size={11} className="text-[#667085]" />
            </button>

            {periodDropdownOpen && (
              <div className="absolute left-0 mt-1 w-44 bg-white rounded-enterprise shadow-lg border border-[#E5E7EB] py-1 z-30 animate-in fade-in zoom-in-95 duration-150">
                {periods.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setSelectedPeriod(p);
                      setPeriodDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-[12px] hover:bg-[#F7F8FA] transition-colors ${
                      selectedPeriod === p ? 'text-[#2563EB] font-semibold bg-blue-50/70' : 'text-[#111827]'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <Link
          href="/dashboard#budget-detailed-report"
          onClick={onOpenReport}
          className="text-[12px] font-medium text-[#2563EB] hover:text-blue-700 hover:underline inline-flex items-center gap-1 group self-start sm:self-auto"
        >
          <span>Open Budget Report</span>
          <ArrowRightIcon size={11} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* Top Split Section: Stat blocks (Left) + Donut Progress (Right) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 py-5 items-center">
        {/* Left 3 compact stat blocks */}
        <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Achieved */}
          <div className="p-3.5 rounded-enterprise bg-[#F7F8FA] border border-[#E5E7EB]/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-[#667085] uppercase tracking-wider">
                Achieved
              </span>
              <span className="text-[10px] font-semibold text-[#16A34A] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                {BUDGET_METRICS.achieved.percentage}%
              </span>
            </div>
            <div className="mt-1.5 text-[18px] sm:text-[20px] font-semibold text-[#111827] tabular-nums">
              {BUDGET_METRICS.achieved.formatted}
            </div>
            <p className="text-[11px] text-[#98A2B3] mt-0.5">
              Settled & billed expenses
            </p>
          </div>

          {/* Budgeted (Committed) */}
          <div className="p-3.5 rounded-enterprise bg-[#F7F8FA] border border-[#E5E7EB]/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-[#667085] uppercase tracking-wider">
                Committed
              </span>
              <span className="text-[10px] font-medium text-[#667085] bg-gray-200/80 px-1.5 py-0.5 rounded">
                100%
              </span>
            </div>
            <div className="mt-1.5 text-[18px] sm:text-[20px] font-semibold text-[#111827] tabular-nums">
              {BUDGET_METRICS.committed.formatted}
            </div>
            <p className="text-[11px] text-[#98A2B3] mt-0.5">
              Approved department cap
            </p>
          </div>

          {/* Advanced */}
          <div className="p-3.5 rounded-enterprise bg-[#F7F8FA] border border-[#E5E7EB]/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-[#667085] uppercase tracking-wider">
                Advanced
              </span>
              <span className="text-[10px] font-semibold text-[#2563EB] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                {BUDGET_METRICS.advanced.percentage}%
              </span>
            </div>
            <div className="mt-1.5 text-[18px] sm:text-[20px] font-semibold text-[#111827] tabular-nums">
              {BUDGET_METRICS.advanced.formatted}
            </div>
            <p className="text-[11px] text-[#98A2B3] mt-0.5">
              Pre-payments & encumbrances
            </p>
          </div>
        </div>

        {/* Right side: Donut Chart */}
        <div className="md:col-span-4 flex items-center justify-center md:justify-end gap-5 pl-0 md:pl-4 border-t md:border-t-0 md:border-l border-[#F0F2F5] pt-4 md:pt-0">
          <div className="relative flex items-center justify-center">
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              className="transform -rotate-90"
              aria-label={`Budget utilization chart: ${achievedPercent.toFixed(1)}% achieved`}
            >
              {/* Background remainder circle */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="#E5E7EB"
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              {/* Achieved segment */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="#2563EB"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-700 ease-out"
              />
            </svg>
            {/* Center metric */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[18px] font-bold text-[#111827] tabular-nums leading-none">
                {achievedPercent.toFixed(1)}%
              </span>
              <span className="text-[10px] font-medium text-[#667085] mt-0.5 uppercase tracking-wider">
                Utilized
              </span>
            </div>
          </div>

          {/* Chart Legend */}
          <div className="space-y-2 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#2563EB] shrink-0" />
              <div>
                <span className="text-[#111827] font-medium">Achieved</span>
                <span className="text-[#667085] ml-1.5 tabular-nums">74.4%</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#E5E7EB] shrink-0" />
              <div>
                <span className="text-[#111827] font-medium">Remaining</span>
                <span className="text-[#667085] ml-1.5 tabular-nums">{remainingPercent.toFixed(1)}%</span>
              </div>
            </div>
            <div className="text-[10px] text-[#98A2B3] pt-1">
              ₹6,35,000 remaining buffer
            </div>
          </div>
        </div>
      </div>

      {/* Below: Compact Table with horizontal scroll safety for mobile */}
      <div className="mt-4 pt-4 border-t border-[#F0F2F5]">
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-[13px] font-semibold text-[#111827]">
            Top Budgets by Utilization
          </h3>
          <span className="text-[11px] text-[#667085]">
            5 tracked categories
          </span>
        </div>

        <div className="overflow-x-auto -mx-5 px-5 sm:mx-0 sm:px-0">
          <table className="w-full text-left border-collapse min-w-[560px]" aria-label="Top Budgets by Utilization">
            <thead>
              <tr className="border-b border-[#E5E7EB] text-[11px] uppercase tracking-wider font-semibold text-[#667085] bg-[#F7F8FA]">
                <th scope="col" className="py-2.5 px-3 font-semibold">Budget Name</th>
                <th scope="col" className="py-2.5 px-3 font-semibold">Period</th>
                <th scope="col" className="py-2.5 px-3 text-right font-semibold">Committed</th>
                <th scope="col" className="py-2.5 px-3 text-right font-semibold">Achieved</th>
                <th scope="col" className="py-2.5 px-3 font-semibold w-40">% Used</th>
                <th scope="col" className="py-2.5 px-3 text-right font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] text-[13px]">
              {BUDGET_RECORDS.map((item) => {
                const isOver = item.percentUsed > 100;
                const isNear = item.percentUsed >= 90 && !isOver;

                const barColor = isOver
                  ? 'bg-[#DC2626]'
                  : isNear
                  ? 'bg-[#F59E0B]'
                  : 'bg-[#2563EB]';

                const badgeClass = isOver
                  ? 'bg-rose-50 text-[#DC2626] border-rose-200'
                  : isNear
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-blue-50 text-[#2563EB] border-blue-200';

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-[#F9FAFB] transition-colors"
                  >
                    <td className="py-2.5 px-3 font-medium text-[#111827]">
                      {item.name}
                    </td>
                    <td className="py-2.5 px-3 text-[#667085] text-[12px]">
                      {item.period}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#111827] tabular-nums">
                      {formatCurrency(item.committed)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#111827] font-medium tabular-nums">
                      {formatCurrency(item.achieved)}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden">
                          <div
                            className={`h-full ${barColor} rounded-full transition-all duration-300`}
                            style={{ width: `${Math.min(item.percentUsed, 100)}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-medium text-[#111827] w-11 text-right tabular-nums">
                          {item.percentUsed.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span
                        className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full border ${badgeClass}`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
