export type TransactionType = 'SO' | 'PO' | 'Invoice' | 'Bill' | 'Payment' | 'Journal';
export type TransactionStatus = 'Draft' | 'Confirmed' | 'Paid' | 'Overdue';

export interface TransactionLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  total: number;
}

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  referenceNo: string;
  partner: string;
  partnerGst?: string;
  amount: number;
  status: TransactionStatus;
  dueDate?: string;
  paymentMethod?: string;
  account?: string;
  notes?: string;
  lineItems: TransactionLineItem[];
  timeline: {
    title: string;
    timestamp: string;
    user: string;
  }[];
}

export interface KpiItem {
  id: string;
  title: string;
  value: number;
  formattedValue: string;
  sublabel: string;
  change: string;
  isPositive: boolean;
  deltaType: 'increase' | 'decrease';
  sparkline: number[];
  periodContext: string;
}

export interface BudgetRecord {
  id: string;
  name: string;
  period: string;
  committed: number;
  achieved: number;
  percentUsed: number;
  status: 'On Track' | 'Approaching Limit' | 'Over Budget';
}

export interface AiInsight {
  id: string;
  type: 'anomaly' | 'risk' | 'reconciliation';
  title: string;
  description: string;
  actionText: string;
  badge: string;
  severity: 'warning' | 'info' | 'critical';
  details?: {
    entity: string;
    variance: string;
    recommendation: string;
  };
}

export const INITIAL_KPIS: KpiItem[] = [
  {
    id: 'receivables',
    title: 'Total Receivables',
    value: 482300,
    formattedValue: '₹4,82,300',
    sublabel: 'from unpaid Customer Invoices',
    change: '+8.2%',
    isPositive: true,
    deltaType: 'increase',
    sparkline: [38, 42, 40, 45, 43, 49, 52, 48, 55, 58],
    periodContext: 'vs last month',
  },
  {
    id: 'payables',
    title: 'Total Payables',
    value: 215400,
    formattedValue: '₹2,15,400',
    sublabel: 'from unpaid Vendor Bills',
    change: '-4.1%',
    isPositive: true, // Payables decreasing is financially favorable
    deltaType: 'decrease',
    sparkline: [50, 48, 52, 47, 46, 44, 43, 40, 39, 36],
    periodContext: 'vs last month',
  },
  {
    id: 'profit',
    title: 'Net Profit (This Period)',
    value: 164850,
    formattedValue: '₹1,64,850',
    sublabel: 'from P&L statements (34.2% margin)',
    change: '+14.6%',
    isPositive: true,
    deltaType: 'increase',
    sparkline: [22, 25, 24, 29, 31, 35, 33, 40, 42, 46],
    periodContext: 'vs last month',
  },
  {
    id: 'cash_balance',
    title: 'Cash & Bank Balance',
    value: 892100,
    formattedValue: '₹8,92,100',
    sublabel: 'sum of 3 linked Bank + Cash accounts',
    change: '+2.8%',
    isPositive: true,
    deltaType: 'increase',
    sparkline: [70, 72, 69, 74, 75, 78, 76, 80, 82, 85],
    periodContext: 'vs last month',
  },
];

export const SALES_METRICS = {
  total: 757000,
  confirmed: {
    count: 42,
    amount: 645000,
    formatted: '₹6,45,000',
    percentage: 85.2,
  },
  draft: {
    count: 8,
    amount: 112000,
    formatted: '₹1,12,000',
    percentage: 14.8,
  },
};

export const PURCHASE_METRICS = {
  total: 452700,
  confirmed: {
    count: 28,
    amount: 384500,
    formatted: '₹3,84,500',
    percentage: 84.9,
  },
  draft: {
    count: 5,
    amount: 68200,
    formatted: '₹68,200',
    percentage: 15.1,
  },
};

export const BUDGET_METRICS = {
  period: 'September 2026',
  achieved: {
    amount: 1845000,
    formatted: '₹18,45,000',
    percentage: 74.4,
  },
  committed: {
    amount: 2480000,
    formatted: '₹24,80,000',
    percentage: 100.0,
  },
  advanced: {
    amount: 420000,
    formatted: '₹4,20,000',
    percentage: 16.9,
  },
};

export const BUDGET_RECORDS: BudgetRecord[] = [
  {
    id: 'b-1',
    name: 'Operations & Logistics',
    period: 'Sep 2026',
    committed: 800000,
    achieved: 672000,
    percentUsed: 84.0,
    status: 'On Track',
  },
  {
    id: 'b-2',
    name: 'Marketing & Digital Acquisition',
    period: 'Sep 2026',
    committed: 550000,
    achieved: 510000,
    percentUsed: 92.7,
    status: 'Approaching Limit',
  },
  {
    id: 'b-3',
    name: 'IT Cloud & Enterprise SaaS',
    period: 'Sep 2026',
    committed: 420000,
    achieved: 295000,
    percentUsed: 70.2,
    status: 'On Track',
  },
  {
    id: 'b-4',
    name: 'Office Facilities & Lease',
    period: 'Sep 2026',
    committed: 450000,
    achieved: 465000,
    percentUsed: 103.3,
    status: 'Over Budget',
  },
  {
    id: 'b-5',
    name: 'Employee Development & Perks',
    period: 'Sep 2026',
    committed: 260000,
    achieved: 185000,
    percentUsed: 71.1,
    status: 'On Track',
  },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    date: '05 Sep 2026',
    type: 'Invoice',
    referenceNo: 'INV-2026-104',
    partner: 'TimberCraft Furnishings Ltd',
    partnerGst: '27AABCT3918Q1ZP',
    amount: 92450,
    status: 'Paid',
    dueDate: '20 Sep 2026',
    paymentMethod: 'NEFT / RTGS Transfer',
    account: '1001 - HDFC Primary Operating',
    notes: 'Bulk purchase order for Teak conference tables and ergonomic chairs.',
    lineItems: [
      { id: 'li-1', description: 'Executive Solid Teak Desk (6ft x 3ft)', quantity: 4, unitPrice: 18500, taxRate: 18, total: 74000 },
      { id: 'li-2', description: 'Mesh Task Ergonomic Chair Pro', quantity: 6, unitPrice: 2650, taxRate: 18, total: 15900 },
    ],
    timeline: [
      { title: 'Invoice created & sent', timestamp: '01 Sep 2026, 10:15 AM', user: 'Vaibhav K.' },
      { title: 'Payment verified via Bank Feed', timestamp: '05 Sep 2026, 02:40 PM', user: 'Smart Reconciliation AI' },
    ],
  },
  {
    id: 'tx-2',
    date: '04 Sep 2026',
    type: 'Bill',
    referenceNo: 'BILL-2026-089',
    partner: 'Zenith Hardware & Fasteners',
    partnerGst: '29AAACZ4812K1Z3',
    amount: 64800,
    status: 'Confirmed',
    dueDate: '19 Sep 2026',
    paymentMethod: 'Pending',
    account: '2001 - Accounts Payable Trade',
    notes: 'Monthly batch shipment of industrial stainless steel hinges and drawer slides.',
    lineItems: [
      { id: 'li-3', description: 'Soft-close Hydraulic Concealed Hinges (Box of 50)', quantity: 20, unitPrice: 1800, taxRate: 18, total: 36000 },
      { id: 'li-4', description: 'Heavy Duty Ball Bearing Slides 18"', quantity: 40, unitPrice: 720, taxRate: 18, total: 28800 },
    ],
    timeline: [
      { title: 'Vendor bill received & entered', timestamp: '04 Sep 2026, 11:30 AM', user: 'Sneha M.' },
      { title: 'Three-way match confirmed with PO-2026-042', timestamp: '04 Sep 2026, 11:45 AM', user: 'System' },
    ],
  },
  {
    id: 'tx-3',
    date: '04 Sep 2026',
    type: 'SO',
    referenceNo: 'SO-2026-118',
    partner: 'Apex Logistics & Warehousing',
    partnerGst: '07AAACA2134F1ZX',
    amount: 142000,
    status: 'Confirmed',
    dueDate: '25 Sep 2026',
    paymentMethod: 'Net 30',
    account: '4001 - Commercial Sales Revenue',
    notes: 'Custom modular workstation configuration for regional logistics hub.',
    lineItems: [
      { id: 'li-5', description: 'Modular 4-Pod Office Cubicle Cluster', quantity: 3, unitPrice: 38000, taxRate: 18, total: 114000 },
      { id: 'li-6', description: 'Acoustic Desk Dividers (Felt Charcoal)', quantity: 12, unitPrice: 2333, taxRate: 18, total: 28000 },
    ],
    timeline: [
      { title: 'Quote generated', timestamp: '02 Sep 2026, 04:00 PM', user: 'Rohan Sharma' },
      { title: 'Customer approved & confirmed', timestamp: '04 Sep 2026, 09:12 AM', user: 'Rohan Sharma' },
    ],
  },
  {
    id: 'tx-4',
    date: '03 Sep 2026',
    type: 'Invoice',
    referenceNo: 'INV-2026-098',
    partner: 'Nordic Living Studios',
    partnerGst: '33AABCN9921D1Z5',
    amount: 58200,
    status: 'Overdue',
    dueDate: '28 Aug 2026',
    paymentMethod: 'Awaiting Remittance',
    account: '1101 - Accounts Receivable Trade',
    notes: 'Payment overdue by 8 days. First reminder dispatched.',
    lineItems: [
      { id: 'li-7', description: 'Minimalist Oak Veneer Bookshelf (5-tier)', quantity: 4, unitPrice: 12500, taxRate: 18, total: 50000 },
      { id: 'li-8', description: 'Freight & Specialized Handling', quantity: 1, unitPrice: 8200, taxRate: 0, total: 8200 },
    ],
    timeline: [
      { title: 'Invoice issued', timestamp: '14 Aug 2026, 02:20 PM', user: 'Vaibhav K.' },
      { title: 'Due date passed without settlement', timestamp: '28 Aug 2026, 11:59 PM', user: 'System' },
      { title: 'Payment Risk Alert flagged', timestamp: '03 Sep 2026, 10:00 AM', user: 'Risk Engine AI' },
    ],
  },
  {
    id: 'tx-5',
    date: '03 Sep 2026',
    type: 'PO',
    referenceNo: 'PO-2026-089',
    partner: 'GreenLeaf Timber Suppliers',
    partnerGst: '32AABCG6420P1Z1',
    amount: 185000,
    status: 'Confirmed',
    dueDate: '15 Sep 2026',
    paymentMethod: 'Advance 50%',
    account: '1201 - Raw Materials Inventory',
    notes: 'Bulk seasoned Malaysian Sal Wood logs for export order batch #8.',
    lineItems: [
      { id: 'li-9', description: 'Seasoned Hardwood Sal Planks (CFT)', quantity: 150, unitPrice: 1100, taxRate: 12, total: 165000 },
      { id: 'li-10', description: 'Kiln Drying & Moisture Testing Certification', quantity: 1, unitPrice: 20000, taxRate: 18, total: 20000 },
    ],
    timeline: [
      { title: 'Purchase Order created', timestamp: '03 Sep 2026, 01:10 PM', user: 'Sneha M.' },
      { title: 'Anomaly detected: 185% above 3-month vendor baseline', timestamp: '03 Sep 2026, 01:12 PM', user: 'Anomaly Detection AI' },
    ],
  },
  {
    id: 'tx-6',
    date: '02 Sep 2026',
    type: 'Payment',
    referenceNo: 'PAY-2026-077',
    partner: 'Apex Logistics & Warehousing',
    amount: 35000,
    status: 'Paid',
    paymentMethod: 'IMPS Direct',
    account: '1002 - ICICI Current Account',
    notes: 'Advance milestone deposit for Project Alpha hub setup.',
    lineItems: [
      { id: 'li-11', description: 'Advance token payment for SO-2026-118', quantity: 1, unitPrice: 35000, taxRate: 0, total: 35000 },
    ],
    timeline: [
      { title: 'Incoming payment matched', timestamp: '02 Sep 2026, 03:22 PM', user: 'Smart Reconciliation AI' },
    ],
  },
  {
    id: 'tx-7',
    date: '02 Sep 2026',
    type: 'Journal',
    referenceNo: 'JE-2026-031',
    partner: 'General Ledger Adjustment',
    amount: 24500,
    status: 'Draft',
    account: '6010 - Depreciation on Machinery',
    notes: 'Monthly depreciation entry for CNC woodworking milling equipment.',
    lineItems: [
      { id: 'li-12', description: 'Depreciation Expense - Plant Machinery', quantity: 1, unitPrice: 24500, taxRate: 0, total: 24500 },
    ],
    timeline: [
      { title: 'Draft Journal Entry initiated', timestamp: '02 Sep 2026, 06:15 PM', user: 'Vaibhav K.' },
    ],
  },
  {
    id: 'tx-8',
    date: '01 Sep 2026',
    type: 'Bill',
    referenceNo: 'BILL-2026-084',
    partner: 'SteelTech Industrial Fittings',
    partnerGst: '27AABCS7712M1Z0',
    amount: 32600,
    status: 'Paid',
    dueDate: '10 Sep 2026',
    paymentMethod: 'HDFC Corporate Card',
    account: '2001 - Accounts Payable Trade',
    notes: 'Cast iron table legs and powder-coated steel brackets.',
    lineItems: [
      { id: 'li-13', description: 'Industrial Matte Black Hairpin Legs (Set of 4)', quantity: 25, unitPrice: 1304, taxRate: 18, total: 32600 },
    ],
    timeline: [
      { title: 'Bill entered', timestamp: '01 Sep 2026, 11:00 AM', user: 'Sneha M.' },
      { title: 'Corporate card cleared', timestamp: '01 Sep 2026, 11:05 AM', user: 'Vaibhav K.' },
    ],
  },
];

export const AI_INSIGHTS: AiInsight[] = [
  {
    id: 'ai-1',
    type: 'anomaly',
    title: 'Anomaly Detection',
    description: '1 unusual purchase amount flagged this week (PO-2026-089 for ₹1,85,000 exceeds 3-month vendor baseline by 185%).',
    actionText: 'Review Purchase Order',
    badge: 'Unusual Amount',
    severity: 'warning',
    details: {
      entity: 'GreenLeaf Timber Suppliers (PO-2026-089)',
      variance: '+185% over historical avg (₹65,000)',
      recommendation: 'Verify contract volume or manager approval before payment authorization.',
    },
  },
  {
    id: 'ai-2',
    type: 'risk',
    title: 'Payment Risk Engine',
    description: '2 customer invoices (₹1,42,000) likely to go overdue based on delayed settlement patterns for Apex Logistics.',
    actionText: 'Inspect Aging Risk',
    badge: 'High Probability',
    severity: 'warning',
    details: {
      entity: 'Apex Logistics (INV-2026-098 & SO-2026-118)',
      variance: 'Avg days to settle increased from 14 to 38 days',
      recommendation: 'Issue courtesy reminder with early-payment 2% cash discount incentive.',
    },
  },
  {
    id: 'ai-3',
    type: 'reconciliation',
    title: 'Smart Reconciliation',
    description: '14 bank feed transactions auto-matched with 99.4% confidence score ready for 1-click ledger clearance.',
    actionText: 'Batch Reconcile (14)',
    badge: '99.4% Match',
    severity: 'info',
    details: {
      entity: 'HDFC & ICICI Primary Feeds',
      variance: 'Zero ledger discrepancy detected',
      recommendation: 'Click to auto-post 14 journal balances to general ledger.',
    },
  },
];

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}
