'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';
import {
  DashboardIcon,
  ChartOfAccountsIcon,
  JournalEntriesIcon,
  PurchasesIcon,
  BudgetsIcon,
  SettingsIcon,
  HelpIcon,
  ChevronDownIcon,
  XIcon,
  CheckIcon,
  LogOutIcon,
  FileTextIcon,
  ReceiptIcon,
  CreditCardIcon,
  ReconciliationIcon,
  RiskEngineIcon,
  AnomalyIcon,
} from '@/components/icons';
import { NAVIGATION_CONFIG, UserRole } from '@/lib/navigation-config';
import { useAuth } from '@/components/navigation/AuthContext';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

type IconComponent = React.ComponentType<{ size?: number; className?: string }>;

const ICON_MAP: Record<string, IconComponent> = {
  DashboardIcon,
  ChartOfAccountsIcon,
  JournalEntriesIcon,
  PurchasesIcon,
  BudgetsIcon,
  ReconciliationIcon,
  RiskEngineIcon,
  AnomalyIcon,
  SettingsIcon,
  HelpIcon,
  FileTextIcon,
  ReceiptIcon,
  CreditCardIcon,
  // Aliases from nav config
  ContactsIcon: FileTextIcon,
  ProductsIcon: ReceiptIcon,
  SalesIcon: CreditCardIcon,
  PaymentsIcon: CreditCardIcon,
  ReportIcon: ChartOfAccountsIcon,
  UsersIcon: DashboardIcon,
  InvoiceIcon: FileTextIcon,
  BillIcon: ReceiptIcon,
};

// Defined OUTSIDE to preserve React component identity across renders
function NavLink({
  item,
  pathname,
  onCloseMobile,
}: {
  item: { name: string; href: string; icon: string; badge?: string };
  pathname: string | null;
  onCloseMobile: () => void;
}) {
  const Icon: IconComponent = ICON_MAP[item.icon] || DashboardIcon;
  const active = pathname
    ? item.href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(item.href)
    : false;

  return (
    <Link
      href={item.href}
      onClick={() => {
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
          onCloseMobile();
        }
      }}
      className={`relative flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all ${
        active
          ? 'bg-blue-50 text-[#2563EB] font-semibold'
          : 'text-[#667085] hover:text-[#111827] hover:bg-[#F7F8FA]'
      }`}
    >
      {active && (
        <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-[#2563EB] rounded-r-sm" />
      )}
      <Icon size={17} className={active ? 'text-[#2563EB]' : 'text-[#667085]'} />
      <span className="truncate">{item.name}</span>
      {item.badge && (
        <span className="ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-50 text-[#2563EB] border border-blue-200">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

export function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth(); // ← use centralized auth, no localStorage reads here
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [currentWorkspace, setCurrentWorkspace] = useState('Urban Furniture Pvt Ltd');

  const workspaces = [
    { id: '1', name: 'Urban Furniture Pvt Ltd' },
    { id: '2', name: 'TimberCraft Studio' },
    { id: '3', name: 'Zenith Holdings Corp' },
  ];

  // Role from auth context — always correct, no flicker
  const userRole: UserRole = user?.role || 'Admin';

  const mainNavItems = NAVIGATION_CONFIG.main.filter((item) =>
    item.roles.includes(userRole)
  );
  const reportsNavItems = NAVIGATION_CONFIG.reports.filter((item) =>
    item.roles.includes(userRole)
  );
  const adminNavItems = NAVIGATION_CONFIG.admin.filter((item) =>
    item.roles.includes(userRole)
  );
  const contactNavItems = NAVIGATION_CONFIG.contact.filter((item) =>
    item.roles.includes(userRole)
  );

  const isSettingsActive = pathname?.startsWith('/settings') ?? false;

  const displayName = user?.name || user?.loginId || 'Admin User';
  const displayEmail = user?.email || 'admin@ledgercraft.io';
  const displayRole = userRole.toUpperCase();
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/50 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-60 bg-white border-r border-[#E5E7EB] transition-transform duration-200 ease-in-out ${
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
        aria-label="Main Navigation"
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-[#E5E7EB] flex-shrink-0">
          <Link href="/dashboard" className="focus:outline-none">
            <Logo size="sm" />
          </Link>
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1.5 text-[#667085] hover:text-[#111827] rounded-md hover:bg-[#F7F8FA] lg:hidden transition-colors"
            aria-label="Close sidebar"
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Role Badge */}
        <div className="px-4 py-2 border-b border-[#E5E7EB] bg-[#F7F8FA] flex-shrink-0">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
            userRole === 'Admin'
              ? 'bg-blue-50 text-[#2563EB] border border-blue-200'
              : userRole === 'Accountant'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-purple-50 text-purple-700 border border-purple-200'
          }`}>
            {userRole}
          </span>
          <span className="ml-2 text-[11px] text-[#98A2B3]">{displayName}</span>
        </div>

        {/* Workspace Selector */}
        <div className="relative px-3 py-2 border-b border-[#E5E7EB] flex-shrink-0">
          <button
            type="button"
            onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] bg-white text-left hover:border-gray-300 transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-md bg-blue-50 text-[#2563EB] font-bold text-[10px] flex items-center justify-center shrink-0 border border-blue-100">
                UF
              </div>
              <div className="truncate">
                <p className="text-[11px] font-medium text-[#111827] truncate leading-tight">
                  {currentWorkspace}
                </p>
                <p className="text-[10px] text-[#98A2B3] leading-tight">FY 2026-2027</p>
              </div>
            </div>
            <ChevronDownIcon size={13} className="text-[#667085] shrink-0 ml-1" />
          </button>

          {workspaceMenuOpen && (
            <div className="absolute left-3 right-3 top-full mt-1 z-50 bg-white rounded-lg shadow-xl border border-[#E5E7EB] py-1 text-xs">
              <div className="px-3 py-1.5 font-semibold text-[#98A2B3] text-[10px] uppercase tracking-wider border-b border-[#E5E7EB]">
                Switch Workspace
              </div>
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => { setCurrentWorkspace(ws.name); setWorkspaceMenuOpen(false); }}
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

        {/* Scrollable Nav */}
        <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">

          {/* Contact-only nav */}
          {userRole === 'Contact' && contactNavItems.length > 0 && (
            <div>
              <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#98A2B3]">My Account</p>
              <nav className="space-y-0.5">
                {contactNavItems.map((item) => (
                  <NavLink key={item.href} item={item} pathname={pathname} onCloseMobile={onCloseMobile} />
                ))}
              </nav>
            </div>
          )}

          {/* Main Finance & Accounting (Admin + Accountant) */}
          {mainNavItems.length > 0 && (
            <div>
              <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#98A2B3]">Finance &amp; Accounting</p>
              <nav className="space-y-0.5">
                {mainNavItems.map((item) => (
                  <NavLink key={item.href} item={item} pathname={pathname} onCloseMobile={onCloseMobile} />
                ))}
              </nav>
            </div>
          )}

          {/* Reports */}
          {reportsNavItems.length > 0 && (
            <div className="pt-1 border-t border-[#E5E7EB]">
              <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#98A2B3]">Reports</p>
              <nav className="space-y-0.5">
                {reportsNavItems.map((item) => (
                  <NavLink key={item.href} item={item} pathname={pathname} onCloseMobile={onCloseMobile} />
                ))}
              </nav>
            </div>
          )}

          {/* Admin only */}
          {adminNavItems.length > 0 && (
            <div className="pt-1 border-t border-[#E5E7EB]">
              <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#98A2B3]">Administration</p>
              <nav className="space-y-0.5">
                {adminNavItems.map((item) => (
                  <NavLink key={item.href} item={item} pathname={pathname} onCloseMobile={onCloseMobile} />
                ))}
              </nav>
            </div>
          )}
        </div>

        {/* Bottom — Settings + User */}
        <div className="border-t border-[#E5E7EB] p-2 space-y-0.5 bg-white flex-shrink-0">
          {userRole !== 'Contact' && (
            <Link
              href="/settings"
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                isSettingsActive
                  ? 'bg-blue-50 text-[#2563EB]'
                  : 'text-[#667085] hover:text-[#111827] hover:bg-[#F7F8FA]'
              }`}
            >
              <SettingsIcon size={16} className={isSettingsActive ? 'text-[#2563EB]' : 'text-[#667085]'} />
              <span>Settings</span>
            </Link>
          )}
          <Link
            href="#help"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-[#667085] hover:text-[#111827] hover:bg-[#F7F8FA] transition-colors"
          >
            <HelpIcon size={16} className="text-[#667085]" />
            <span>Help &amp; Support</span>
          </Link>

          {/* User Profile */}
          <div className="pt-1 mt-1 border-t border-[#E5E7EB] relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[#F7F8FA] transition-colors text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#0B1F3A] text-white flex items-center justify-center font-bold text-xs shrink-0 ring-2 ring-blue-100">
                  {initials}
                </div>
                <div className="truncate">
                  <p className="text-[13px] font-semibold text-[#111827] leading-tight truncate">{displayName}</p>
                  <p className="text-[11px] text-[#667085] leading-tight truncate">{displayRole}</p>
                </div>
              </div>
              <ChevronDownIcon size={13} className="text-[#98A2B3] shrink-0 ml-1" />
            </button>

            {userMenuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-white rounded-lg shadow-xl border border-[#E5E7EB] py-1.5 text-xs z-50">
                <div className="px-3 py-1.5 border-b border-[#E5E7EB]">
                  <p className="font-semibold text-[#111827] truncate">{displayName}</p>
                  <p className="text-[11px] text-[#667085] truncate">{displayEmail}</p>
                </div>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-[#111827] hover:bg-[#F7F8FA] transition-colors"
                  onClick={() => setUserMenuOpen(false)}
                >
                  Profile Preferences
                </button>
                <div className="border-t border-[#E5E7EB] my-1" />
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-[#DC2626] hover:bg-red-50 flex items-center gap-2 font-medium transition-colors"
                  onClick={logout}
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
