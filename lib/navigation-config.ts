// Role-based navigation configuration
export type UserRole = 'Admin' | 'Accountant' | 'Contact';

export interface NavItem {
  name: string;
  href: string;
  icon: string;
  badge?: string;
  roles: UserRole[]; // Which roles can see this item
}

export const NAVIGATION_CONFIG = {
  // Main Navigation - Finance & Accounting
  main: [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: 'DashboardIcon',
      roles: ['Admin', 'Accountant', 'Contact'] as UserRole[],
    },
    {
      name: 'Contacts',
      href: '/contacts',
      icon: 'ContactsIcon',
      roles: ['Admin', 'Accountant'] as UserRole[],
    },
    {
      name: 'Products',
      href: '/products',
      icon: 'ProductsIcon',
      roles: ['Admin', 'Accountant'] as UserRole[],
    },
    {
      name: 'Purchases',
      href: '/purchases/orders',
      icon: 'PurchasesIcon',
      roles: ['Admin', 'Accountant'] as UserRole[],
    },
    {
      name: 'Sales',
      href: '/sales/orders',
      icon: 'SalesIcon',
      roles: ['Admin', 'Accountant'] as UserRole[],
    },
    {
      name: 'Payments',
      href: '/payments',
      icon: 'PaymentsIcon',
      roles: ['Admin', 'Accountant', 'Contact'] as UserRole[],
    },
    {
      name: 'Journal Entries',
      href: '/journal-entries',
      icon: 'JournalEntriesIcon',
      roles: ['Admin', 'Accountant'] as UserRole[],
    },
    {
      name: 'Chart of Accounts',
      href: '/chart-of-accounts',
      icon: 'ChartOfAccountsIcon',
      roles: ['Admin', 'Accountant'] as UserRole[],
    },
  ],

  // Reports Section
  reports: [
    {
      name: 'Balance Sheet',
      href: '/reports/balance-sheet',
      icon: 'ReportIcon',
      roles: ['Admin', 'Accountant'] as UserRole[],
    },
    {
      name: 'Profit & Loss',
      href: '/reports/profit-loss',
      icon: 'ReportIcon',
      roles: ['Admin', 'Accountant'] as UserRole[],
    },
    {
      name: 'Budget Report',
      href: '/reports/budget-report',
      icon: 'BudgetsIcon',
      roles: ['Admin', 'Accountant'] as UserRole[],
    },
  ],

  // Admin Only
  admin: [
    {
      name: 'User Management',
      href: '/users',
      icon: 'UsersIcon',
      roles: ['Admin'] as UserRole[],
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: 'SettingsIcon',
      roles: ['Admin'] as UserRole[],
    },
  ],

  // Contact User Only
  contact: [
    {
      name: 'My Invoices',
      href: '/my-invoices',
      icon: 'InvoiceIcon',
      roles: ['Contact'] as UserRole[],
    },
    {
      name: 'My Bills',
      href: '/my-bills',
      icon: 'BillIcon',
      roles: ['Contact'] as UserRole[],
    },
    {
      name: 'Make Payment',
      href: '/make-payment',
      icon: 'PaymentsIcon',
      roles: ['Contact'] as UserRole[],
    },
  ],
};

/**
 * Filter navigation items based on user role
 */
export function getNavigationForRole(role: UserRole): NavItem[] {
  if (role === 'Contact') {
    return [...NAVIGATION_CONFIG.contact];
  }

  const mainNav = NAVIGATION_CONFIG.main.filter((item) =>
    item.roles.includes(role)
  );
  const reportsNav = NAVIGATION_CONFIG.reports.filter((item) =>
    item.roles.includes(role)
  );
  const adminNav = NAVIGATION_CONFIG.admin.filter((item) =>
    item.roles.includes(role)
  );

  return [...mainNav, ...reportsNav, ...adminNav];
}

/**
 * Check if user can access a specific route
 */
export function canAccessRoute(role: UserRole, path: string): boolean {
  const allNavItems = [
    ...NAVIGATION_CONFIG.main,
    ...NAVIGATION_CONFIG.reports,
    ...NAVIGATION_CONFIG.admin,
    ...NAVIGATION_CONFIG.contact,
  ];

  const navItem = allNavItems.find((item) => path.startsWith(item.href));
  
  if (!navItem) return false; // Unknown route
  
  return navItem.roles.includes(role);
}
