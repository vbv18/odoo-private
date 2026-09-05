'use client';

import React from 'react';
import { XIcon, SparklesIcon, CheckIcon, AlertCircleIcon } from '@/components/icons';
import { AiInsight } from '@/lib/dashboard-data';

interface AiInsightDrawerProps {
  insight: AiInsight | null;
  onClose: () => void;
  onActionComplete: (msg: string) => void;
}

export function AiInsightDrawer({
  insight,
  onClose,
  onActionComplete,
}: AiInsightDrawerProps) {
  if (!insight) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white border-l border-[#E5E7EB] shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between bg-blue-50/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#2563EB] flex items-center justify-center">
                <SparklesIcon size={18} />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold text-[#111827]">
                  {insight.title}
                </h2>
                <span className="text-[11px] font-medium text-[#2563EB] uppercase tracking-wider">
                  Automated Financial Intelligence
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#667085] hover:text-[#111827] rounded-md transition-colors"
            >
              <XIcon size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5 text-[13px]">
            <div className="p-4 rounded-xl bg-[#F7F8FA] border border-[#E5E7EB] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider">
                  Incident Type
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-[#2563EB] border border-blue-200">
                  {insight.badge}
                </span>
              </div>
              <p className="text-[#111827] font-medium leading-relaxed">
                {insight.description}
              </p>
            </div>

            {insight.details && (
              <div className="space-y-3">
                <h3 className="text-[12px] font-semibold text-[#667085] uppercase tracking-wider">
                  Diagnostic Breakdown
                </h3>

                <div className="p-3 rounded-lg border border-[#E5E7EB] space-y-1">
                  <span className="text-[11px] text-[#98A2B3] block">Target Counterparty / Reference</span>
                  <span className="font-semibold text-[#111827] block">
                    {insight.details.entity}
                  </span>
                </div>

                <div className="p-3 rounded-lg border border-[#E5E7EB] space-y-1">
                  <span className="text-[11px] text-[#98A2B3] block">Variance Analysis</span>
                  <span className="font-semibold text-[#DC2626] block">
                    {insight.details.variance}
                  </span>
                </div>

                <div className="p-3.5 rounded-lg bg-emerald-50/60 border border-emerald-200 space-y-1">
                  <span className="text-[11px] font-semibold text-[#16A34A] block uppercase tracking-wider">
                    Recommended Resolution
                  </span>
                  <p className="text-[12px] text-emerald-950 font-medium leading-relaxed">
                    {insight.details.recommendation}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-[#E5E7EB] bg-[#F7F8FA] flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-[12px] font-medium text-[#667085] hover:text-[#111827]"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={() => {
                onActionComplete(`Applied AI recommendation: ${insight.actionText}`);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-[12px] font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
            >
              <CheckIcon size={14} />
              <span>{insight.actionText}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
