import React from 'react';
import { ArrowUpRightIcon, ArrowDownRightIcon } from '@/components/icons';
import { KpiItem } from '@/lib/dashboard-data';

interface KpiCardProps {
  kpi: KpiItem;
  isLoading?: boolean;
}

function MicroSparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 80;
  const height = 28;

  // Build SVG path
  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * (height - 6) - 3;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;

  return (
    <svg
      width={width}
      height={height}
      className="overflow-visible shrink-0"
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
    >
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function KpiCard({ kpi, isLoading }: KpiCardProps) {
  if (isLoading) {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-4.5 space-y-3 animate-pulse">
        <div className="h-3 w-28 bg-gray-200 rounded-sm" />
        <div className="h-7 w-36 bg-gray-200 rounded-sm" />
        <div className="flex items-center justify-between pt-1">
          <div className="h-4 w-24 bg-gray-200 rounded-sm" />
          <div className="h-6 w-16 bg-gray-100 rounded-sm" />
        </div>
      </div>
    );
  }

  // Determine trend color
  const isGreen = kpi.isPositive;
  const trendColor = isGreen ? '#16A34A' : '#DC2626';

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-5 transition-all duration-150 hover:shadow-sm hover:border-gray-300 flex flex-col justify-between min-h-[140px]">
      <div>
        {/* Metric Label */}
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium text-[#667085]">
            {kpi.title}
          </span>
        </div>

        {/* Large Value */}
        <div className="mt-2.5 flex items-baseline justify-between">
          <span className="text-[26px] sm:text-[28px] font-semibold tracking-tight text-[#111827] tabular-nums leading-none">
            {kpi.formattedValue}
          </span>
        </div>

        {/* Sublabel context */}
        <p className="text-[12px] text-[#98A2B3] mt-1.5">
          {kpi.sublabel}
        </p>
      </div>

      {/* Bottom delta & sparkline row */}
      <div className="mt-4 pt-3 border-t border-[#F0F2F5] flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
          <span
            className={`inline-flex items-center gap-0.5 px-2 py-1 rounded text-[11px] font-semibold ${
              isGreen
                ? 'bg-emerald-50 text-[#16A34A]'
                : 'bg-rose-50 text-[#DC2626]'
            }`}
          >
            {kpi.deltaType === 'increase' ? (
              <ArrowUpRightIcon size={12} className={isGreen ? 'text-[#16A34A]' : 'text-[#DC2626]'} />
            ) : (
              <ArrowDownRightIcon size={12} className={isGreen ? 'text-[#16A34A]' : 'text-[#DC2626]'} />
            )}
            <span>{kpi.change}</span>
          </span>
          <span className="text-[11px] text-[#98A2B3]">
            {kpi.periodContext}
          </span>
        </div>

        {/* Inline micro-sparkline */}
        <div className="shrink-0 pl-1">
          <MicroSparkline data={kpi.sparkline} color={trendColor} />
        </div>
      </div>
    </div>
  );
}

export function KpiRow({ kpis, isLoading }: { kpis: KpiItem[]; isLoading?: boolean }) {
  return (
    <section aria-label="Key Performance Indicators" className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} isLoading={isLoading} />
        ))}
      </div>
    </section>
  );
}
