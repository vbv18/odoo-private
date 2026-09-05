import React from 'react';
import {
  RiskEngineIcon,
  AnomalyIcon,
  ReconciliationIcon,
  ArrowRightIcon,
  SparklesIcon,
} from '@/components/icons';
import { AI_INSIGHTS, AiInsight } from '@/lib/dashboard-data';

interface AiInsightsStripProps {
  onReviewInsight: (insight: AiInsight) => void;
  isLoading?: boolean;
}

export function AiInsightsStrip({ onReviewInsight, isLoading }: AiInsightsStripProps) {
  if (isLoading) {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 space-y-3 animate-pulse">
        <div className="h-4 w-32 bg-gray-200 rounded-sm" />
        <div className="h-10 bg-gray-100 rounded-lg" />
      </div>
    );
  }

  const getIcon = (type: AiInsight['type']) => {
    switch (type) {
      case 'anomaly':
        return <AnomalyIcon size={16} className="text-rose-600 shrink-0" />;
      case 'risk':
        return <RiskEngineIcon size={16} className="text-amber-600 shrink-0" />;
      case 'reconciliation':
        return <ReconciliationIcon size={16} className="text-[#2563EB] shrink-0" />;
    }
  };

  return (
    <section aria-label="AI Intelligence Insights">
      <div className="bg-white border border-[#E5E7EB] border-l-[3px] border-l-[#2563EB] rounded-xl p-4 sm:p-5 shadow-2xs">
        {/* Strip Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#F0F2F5]">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-blue-50 text-[#2563EB] flex items-center justify-center">
              <SparklesIcon size={12} />
            </div>
            <h2 className="text-[13px] font-semibold text-[#111827] uppercase tracking-wider">
              Financial Intelligence Insights
            </h2>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-[#2563EB] border border-blue-200">
              3 Active Callouts
            </span>
          </div>
          <span className="text-[11px] text-[#98A2B3]">
            Continuous background analysis
          </span>
        </div>

        {/* Insights list */}
        <div className="divide-y divide-[#F0F2F5]">
          {AI_INSIGHTS.map((insight) => (
            <div
              key={insight.id}
              className="py-2.5 first:pt-3 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-[#F7F8FA]/60 rounded-md px-2 -mx-2 transition-colors"
            >
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                <div className="mt-0.5 sm:mt-0 p-1.5 rounded-md bg-[#F7F8FA] border border-[#E5E7EB]">
                  {getIcon(insight.type)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-semibold text-[#111827]">
                      {insight.title}:
                    </span>
                    <span className="text-[13px] text-[#475569] leading-snug">
                      {insight.description}
                    </span>
                  </div>
                </div>
              </div>

              {/* Review link (spec: icon + one-line text + "Review →" link) */}
              <button
                type="button"
                onClick={() => onReviewInsight(insight)}
                className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#2563EB] hover:text-[#1d4ed8] hover:underline whitespace-nowrap self-end sm:self-center group pl-2"
              >
                <span>{insight.actionText}</span>
                <ArrowRightIcon
                  size={12}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
