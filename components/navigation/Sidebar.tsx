'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LogoIcon,
  DashboardIcon,
  ChartOfAccountsIcon,
  JournalEntriesIcon,
  BankingIcon,
  PurchasesIcon,
  BudgetsIcon,
  ReconciliationIcon,
  RiskEngineIcon,
  AnomalyIcon,
  SettingsIcon,
  HelpIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  XIcon,
  CheckIcon,
} from '@/components/icons';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [currentWorkspace, setCurrentWorkspace] = useState('Urban Furniture Pvt Ltd');

  const workspaces = [
    { id: '1', name: 'Urban Furniture Pvt Ltd', code: 'UF-MUM', active: true },
    { id: '2', name: 'TimberCraft Studio', code: 'TC-BLR', active: false },
    { id: '3', name: 'Zenith Holdings Corp', code: 'ZH-DEL', active: false },
  ];

  const mainNav = [
    { name: 'Dashboard', href: '/dashboard', icon: DashboardIcon },
    { name: 'Chart of Accounts', href: '/dashboard#chart-of-accounts', icon: ChartOfAccountsIcon },
    { name: 'Journal Entries', href: '/dashboard#journal-entries', icon: JournalEntriesIcon },
    { name: 'Banking & Reconciliation', href: '/dashboard#banking', icon: BankingIcon },
    { name: 'Purchases & Bills', href: '/dashboard#purchases', icon: PurchasesIcon },
    { name: 'Budgets & Reports', href: '/dashboard#budgets', icon: BudgetsIcon },
  ];

  const aiNav = [
    { name: 'Smart Reconciliation', href: '/dashboard#ai-recon', icon: ReconciliationIcon, badge: '99.4%' },
    { name: 'Payment Risk Engine', href: '/dashboard#ai-risk', icon: RiskEngineIcon, badge: '2 Alerts' },
    { name: 'Anomaly Detection', href: '/dashboard#ai-anomaly', icon: AnomalyIcon, badge: '1 Flag' },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-60 bg-white border-r border-[#E5E7EB] transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Main Navigation"
      >
        {/* Top Header: Logo & Close button on mobile */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-[#E5E7EB]">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 group focus-visible:outline-hidden"
          >
            <LogoIcon size={24} className="shrink-0 transition-transform group-hover:scale-105" />
            <div className="flex flex-col">
              <span className="text-[15px] font-semibold tracking-tight text-[#111827]">
                LedgerCraft
              </span>
              <span className="text-[10px] uppercase font-medium tracking-wider text-[#98A2B3]">
                Enterprise ERP
              </span>
            </div>
          </Link>

          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1 text-[#667085] hover:text-[#111827] rounded-md lg:hidden"
            aria-label="Close navigation sidebar"
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Workspace Selector */}
        <div className="relative px-3 py-2.5 border-b border-[#E5E7EB] bg-[#F7F8FA]/60">
          <button
            type="button"
            onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] bg-white text-left hover:border-gray-300 transition-colors"
            aria-expanded={workspaceMenuOpen}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-5 h-5 rounded bg-[#16A34A]/10 text-[#16A34A] font-semibold text-[11px] flex items-center justify-center shrink-0">
                UF
              </div>
              <div className="truncate">
                <p className="text-[12px] font-medium text-[#111827] truncate leading-tight">
                  {currentWorkspace}
                </p>
                <p className="text-[10px] text-[#98A2B3] leading-tight">FY 2026-2027</p>
              </div>
            </div>
            <ChevronDownIcon size={13} className="text-[#667085] shrink-0 ml-1" />
          </button>

          {/* Workspace Dropdown */}
          {workspaceMenuOpen && (
            <div className="absolute left-3 right-3 top-13 z-50 bg-white rounded-lg shadow-lg border border-[#E5E7EB] py-1 text-xs">
              <div className="px-3 py-1.5 font-medium text-[#98A2B3] text-[10px] uppercase tracking-wider">
                Switch Workspace
              </div>
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => {
                    setCurrentWorkspace(ws.name);
                    setWorkspaceMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left flex items-center justify-between hover:bg-[#F7F8FA] transition-colors"
                >
                  <span className="font-medium text-[#111827] truncate">{ws.name}</span>
                  {ws.name === currentWorkspace && (
                    <CheckIcon size={12} className="text-[#16A34A] shrink-0 ml-2" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Scrollable Navigation Area */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-5">
          {/* Main Navigation */}
          <div>
            <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#98A2B3]">
              Finance & Accounting
            </div>
            <nav className="space-y-0.5">
              {mainNav.map((item) => {
                const Icon = item.icon;
                const isActive = item.name === 'Dashboard';

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => {
                      if (window.innerWidth < 1024) onCloseMobile();
                    }}
                    className={`relative flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-all ${
                      isActive
                        ? 'bg-[#F0F2F5] text-[#111827] font-semibold'
                        : 'text-[#667085] hover:text-[#111827] hover:bg-[#F7F8FA]'
                    }`}
                  >
                    {/* Left active green bar (spec: left accent bar in Primary green) */}
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-[#16A34A] rounded-r-sm" />
                    )}
                    <Icon
                      size={17}
                      className={isActive ? 'text-[#16A34A]' : 'text-[#667085]'}
                    />
                    <span className="truncate">{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* AI / Intelligence Section (spec: visually separated, small "AI" label above it) */}
          <div className="pt-2 border-t border-[#E5E7EB]">
            <div className="flex items-center justify-between px-2 pb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#2563EB]">
                AI Intelligence
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-widest bg-blue-50 text-[#2563EB] border border-blue-100">
                ACTIVE
              </span>
            </div>
            <nav className="space-y-0.5">
              {aiNav.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => {
                      if (window.innerWidth < 1024) onCloseMobile();
                    }}
                    className="group flex items-center justify-between px-3 py-2 rounded-md text-[13px] font-medium text-[#667085] hover:text-[#111827] hover:bg-[#F7F8FA] transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon size={17} className="text-[#667085] group-hover:text-[#2563EB] transition-colors shrink-0" />
                      <span className="truncate">{item.name}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                          item.badge.includes('Alert')
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : item.badge.includes('Flag')
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-blue-50 text-[#2563EB] border border-blue-200'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Bottom Section (spec: Settings · Help · User profile) */}
        <div className="border-t border-[#E5E7EB] p-2 space-y-1 bg-white">
          <Link
            href="/dashboard#settings"
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[13px] font-medium text-[#667085] hover:text-[#111827] hover:bg-[#F7F8FA] transition-colors"
          >
            <SettingsIcon size={16} className="text-[#667085]" />
            <span>Settings</span>
          </Link>
          <Link
            href="/dashboard#help"
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[13px] font-medium text-[#667085] hover:text-[#111827] hover:bg-[#F7F8FA] transition-colors"
          >
            <HelpIcon size={16} className="text-[#667085]" />
            <span>Help & Support</span>
          </Link>

          {/* User Profile Bar */}
          <div className="pt-2 mt-1 border-t border-[#E5E7EB] relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[#F7F8FA] transition-colors text-left"
              aria-expanded={userMenuOpen}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#111827] text-white flex items-center justify-center font-medium text-xs shrink-0 ring-1 ring-black/10">
                  VK
                </div>
                <div className="truncate">
                  <p className="text-[13px] font-semibold text-[#111827] leading-tight truncate">
                    Vaibhav K.
                  </p>
                  <p className="text-[11px] text-[#667085] leading-tight truncate">
                    Financial Controller
                  </p>
                </div>
              </div>
              <ChevronDownIcon size={13} className="text-[#98A2B3] shrink-0 ml-1" />
            </button>

            {userMenuOpen && (
              <div className="absolute bottom-13 left-2 right-2 bg-white rounded-lg shadow-xl border border-[#E5E7EB] py-1.5 text-xs z-50">
                <div className="px-3 py-1 border-b border-[#E5E7EB]">
                  <p className="font-semibold text-[#111827]">Vaibhav Kulkarni</p>
                  <p className="text-[11px] text-[#667085]">vaibhav@urbanfurniture.in</p>
                </div>
                <button
                  type="button"
                  className="w-full px-3 py-1.5 text-left text-[#111827] hover:bg-[#F7F8FA] flex items-center justify-between"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <span>Profile Preferences</span>
                </button>
                <button
                  type="button"
                  className="w-full px-3 py-1.5 text-left text-[#111827] hover:bg-[#F7F8FA] flex items-center justify-between"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <span>Audit Logs & Security</span>
                </button>
                <div className="border-t border-[#E5E7EB] my-1" />
                <button
                  type="button"
                  className="w-full px-3 py-1.5 text-left text-rose-600 hover:bg-rose-50"
                  onClick={() => setUserMenuOpen(false)}
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
