'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';
import {
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
  XIcon,
  CheckIcon,
  LogOutIcon,
} from '@/components/icons';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface CurrentUser {
  name?: string;
  email?: string;
  role?: string;
  loginId?: string;
}

export function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [currentWorkspace, setCurrentWorkspace] = useState('Urban Furniture Pvt Ltd');
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

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

  const displayName = user?.name || user?.loginId || 'Vaibhav Kulkarni';
  const displayEmail = user?.email || 'admin@ledgercraft.io';
  const displayRole = user?.role ? user.role.toUpperCase() : 'CONTROLLER';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

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
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
        aria-label="Main Navigation"
      >
        {/* Top Header: Brand Logo matching Auth Page */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-[#E5E7EB]">
          <Link
            href="/dashboard"
            onClick={onCloseMobile}
            className="flex items-center gap-2 group focus:outline-hidden"
          >
            <Logo size="sm" />
          </Link>

          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1.5 text-[#667085] hover:text-[#111827] rounded-md hover:bg-[#F7F8FA] lg:hidden transition-colors"
            aria-label="Close navigation sidebar"
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Workspace Selector */}
        <div className="relative px-3 py-2.5 border-b border-[#E5E7EB] bg-[#F7F8FA]/70">
          <button
            type="button"
            onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-enterprise border border-[#E5E7EB] bg-white text-left hover:border-gray-300 transition-colors"
            aria-expanded={workspaceMenuOpen}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-md bg-blue-50 text-[#2563EB] font-bold text-[10px] flex items-center justify-center shrink-0 border border-blue-100">
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
            <div className="absolute left-3 right-3 top-12 z-50 bg-white rounded-enterprise shadow-xl border border-[#E5E7EB] py-1 text-xs">
              <div className="px-3 py-1.5 font-semibold text-[#98A2B3] text-[10px] uppercase tracking-wider border-b border-[#E5E7EB]">
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
                    <CheckIcon size={13} className="text-[#2563EB] shrink-0 ml-2" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Scrollable Navigation Area */}
        <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-5">
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
                    className={`relative flex items-center gap-2.5 px-3 py-2.5 rounded-enterprise text-[13px] font-medium transition-all ${
                      isActive
                        ? 'bg-blue-50 text-[#2563EB] font-semibold'
                        : 'text-[#667085] hover:text-[#111827] hover:bg-[#F7F8FA]'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-[#2563EB] rounded-r-sm" />
                    )}
                    <Icon
                      size={17}
                      className={isActive ? 'text-[#2563EB]' : 'text-[#667085]'}
                    />
                    <span className="truncate">{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* AI Intelligence Section */}
          <div className="pt-2 border-t border-[#E5E7EB]">
            <div className="flex items-center justify-between px-2 pb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#2563EB]">
                AI Intelligence
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-widest bg-blue-50 text-[#2563EB] border border-blue-200">
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
                    className="group flex items-center justify-between px-3 py-2 rounded-enterprise text-[13px] font-medium text-[#667085] hover:text-[#111827] hover:bg-[#F7F8FA] transition-colors"
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
                            ? 'bg-rose-50 text-[#DC2626] border border-rose-200'
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

        {/* Bottom Section */}
        <div className="border-t border-[#E5E7EB] p-2 space-y-1 bg-white">
          <Link
            href="/dashboard#settings"
            onClick={() => {
              if (window.innerWidth < 1024) onCloseMobile();
            }}
            className="flex items-center gap-2.5 px-3 py-2 rounded-enterprise text-[13px] font-medium text-[#667085] hover:text-[#111827] hover:bg-[#F7F8FA] transition-colors"
          >
            <SettingsIcon size={16} className="text-[#667085]" />
            <span>Settings</span>
          </Link>
          <Link
            href="/dashboard#help"
            onClick={() => {
              if (window.innerWidth < 1024) onCloseMobile();
            }}
            className="flex items-center gap-2.5 px-3 py-2 rounded-enterprise text-[13px] font-medium text-[#667085] hover:text-[#111827] hover:bg-[#F7F8FA] transition-colors"
          >
            <HelpIcon size={16} className="text-[#667085]" />
            <span>Help & Support</span>
          </Link>

          {/* User Profile Bar */}
          <div className="pt-2 mt-1 border-t border-[#E5E7EB] relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-full flex items-center justify-between p-2 rounded-enterprise hover:bg-[#F7F8FA] transition-colors text-left"
              aria-expanded={userMenuOpen}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#0B1F3A] text-white flex items-center justify-center font-bold text-xs shrink-0 ring-2 ring-blue-100">
                  {initials}
                </div>
                <div className="truncate">
                  <p className="text-[13px] font-semibold text-[#111827] leading-tight truncate">
                    {displayName}
                  </p>
                  <p className="text-[11px] text-[#667085] leading-tight truncate">
                    {displayRole}
                  </p>
                </div>
              </div>
              <ChevronDownIcon size={13} className="text-[#98A2B3] shrink-0 ml-1" />
            </button>

            {userMenuOpen && (
              <div className="absolute bottom-14 left-2 right-2 bg-white rounded-enterprise shadow-xl border border-[#E5E7EB] py-1.5 text-xs z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 border-b border-[#E5E7EB]">
                  <p className="font-semibold text-[#111827] truncate">{displayName}</p>
                  <p className="text-[11px] text-[#667085] truncate">{displayEmail}</p>
                </div>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-[#111827] hover:bg-[#F7F8FA] flex items-center justify-between transition-colors"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <span>Profile Preferences</span>
                </button>
                <div className="border-t border-[#E5E7EB] my-1" />
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-[#DC2626] hover:bg-red-50 flex items-center gap-2 font-medium transition-colors"
                  onClick={() => {
                    setUserMenuOpen(false);
                    handleLogout();
                  }}
                >
                  <LogOutIcon size={14} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
