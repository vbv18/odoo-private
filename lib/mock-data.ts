/**
 * lib/mock-data.ts
 * 
 * Central mock data for all API routes.
 * Used as fallback when PostgreSQL is unavailable.
 * All data is stored in-memory and persisted to data/*.json files.
 */

import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const dataDir = path.join(process.cwd(), 'data');

function ensureDir() {
  fs.mkdirSync(dataDir, { recursive: true });
}

function readJson<T>(file: string, defaultValue: T): T {
  try {
    const p = path.join(dataDir, file);
    if (!fs.existsSync(p)) return defaultValue;
    return JSON.parse(fs.readFileSync(p, 'utf8')) as T;
  } catch {
    return defaultValue;
  }
}

function writeJson(file: string, data: unknown) {
  ensureDir();
  fs.writeFileSync(path.join(dataDir, file), JSON.stringify(data, null, 2));
}

// ─── Contacts ────────────────────────────────────────────────────────────────
const DEFAULT_CONTACTS = [
  { id: 'c1', name: 'Rajesh Sharma', contact_type: 'Customer', email: 'rajesh@example.com', mobile: '9876543210', city: 'Mumbai', state: 'Maharashtra', pincode: '400001', address: '12 MG Road', is_archived: false, created_at: '2026-01-10T10:00:00Z' },
  { id: 'c2', name: 'Priya Logistics Ltd', contact_type: 'Vendor', email: 'priya@logistics.com', mobile: '9123456780', city: 'Pune', state: 'Maharashtra', pincode: '411001', address: '5 Industrial Area', is_archived: false, created_at: '2026-01-15T10:00:00Z' },
  { id: 'c3', name: 'TimberCraft Studio', contact_type: 'Both', email: 'info@timbercraft.in', mobile: '9988776655', city: 'Bangalore', state: 'Karnataka', pincode: '560001', address: '22 MG Road', is_archived: false, created_at: '2026-02-01T10:00:00Z' },
  { id: 'c4', name: 'Anil Steel Suppliers', contact_type: 'Vendor', email: 'anil@steel.com', mobile: '9012345678', city: 'Surat', state: 'Gujarat', pincode: '395003', address: '8 Industrial Zone', is_archived: false, created_at: '2026-02-15T10:00:00Z' },
  { id: 'c5', name: 'Zenith Holdings Corp', contact_type: 'Customer', email: 'contact@zenith.com', mobile: '9876001234', city: 'Delhi', state: 'Delhi', pincode: '110001', address: 'Connaught Place', is_archived: false, created_at: '2026-03-01T10:00:00Z' },
];

export function getContacts() {
  return readJson('contacts.json', DEFAULT_CONTACTS);
}
export function saveContacts(data: unknown[]) {
  writeJson('contacts.json', data);
}

// ─── Chart of Accounts ───────────────────────────────────────────────────────
const DEFAULT_COA = [
  { id: 'a1', account_code: '1000', account_name: 'Assets', account_type: 'Asset', is_system_account: true, opening_balance: 0, current_balance: 0, is_archived: false, parent_account_id: null, parent_account_name: null },
  { id: 'a2', account_code: '1100', account_name: 'Cash & Bank', account_type: 'Asset', is_system_account: true, opening_balance: 500000, current_balance: 750000, is_archived: false, parent_account_id: 'a1', parent_account_name: 'Assets' },
  { id: 'a3', account_code: '1200', account_name: 'Accounts Receivable', account_type: 'Asset', is_system_account: true, opening_balance: 0, current_balance: 280000, is_archived: false, parent_account_id: 'a1', parent_account_name: 'Assets' },
  { id: 'a4', account_code: '1300', account_name: 'Inventory', account_type: 'Asset', is_system_account: false, opening_balance: 120000, current_balance: 150000, is_archived: false, parent_account_id: 'a1', parent_account_name: 'Assets' },
  { id: 'a5', account_code: '2000', account_name: 'Liabilities', account_type: 'Liability', is_system_account: true, opening_balance: 0, current_balance: 0, is_archived: false, parent_account_id: null, parent_account_name: null },
  { id: 'a6', account_code: '2100', account_name: 'Accounts Payable', account_type: 'Liability', is_system_account: true, opening_balance: 0, current_balance: 95000, is_archived: false, parent_account_id: 'a5', parent_account_name: 'Liabilities' },
  { id: 'a7', account_code: '3000', account_name: 'Capital', account_type: 'Capital', is_system_account: true, opening_balance: 1000000, current_balance: 1200000, is_archived: false, parent_account_id: null, parent_account_name: null },
  { id: 'a8', account_code: '4000', account_name: 'Sales Revenue', account_type: 'Income', is_system_account: true, opening_balance: 0, current_balance: 580000, is_archived: false, parent_account_id: null, parent_account_name: null },
  { id: 'a9', account_code: '5000', account_name: 'Cost of Goods Sold', account_type: 'Expense', is_system_account: true, opening_balance: 0, current_balance: 320000, is_archived: false, parent_account_id: null, parent_account_name: null },
  { id: 'a10', account_code: '5100', account_name: 'Salaries & Wages', account_type: 'Expense', is_system_account: false, opening_balance: 0, current_balance: 85000, is_archived: false, parent_account_id: null, parent_account_name: null },
  { id: 'a11', account_code: '5200', account_name: 'Rent', account_type: 'Expense', is_system_account: false, opening_balance: 0, current_balance: 30000, is_archived: false, parent_account_id: null, parent_account_name: null },
  { id: 'a12', account_code: '5300', account_name: 'Marketing & Advertising', account_type: 'Expense', is_system_account: false, opening_balance: 0, current_balance: 15000, is_archived: false, parent_account_id: null, parent_account_name: null },
];

export function getChartOfAccounts() {
  return readJson('coa.json', DEFAULT_COA);
}
export function saveCOA(data: unknown[]) {
  writeJson('coa.json', data);
}

// ─── Journals ────────────────────────────────────────────────────────────────
const DEFAULT_JOURNALS = [
  { id: 'j1', journal_name: 'Sales Journal', journal_type: 'Sales', code: 'SAL', is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'j2', journal_name: 'Purchase Journal', journal_type: 'Purchase', code: 'PUR', is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'j3', journal_name: 'Cash Journal', journal_type: 'Cash', code: 'CSH', is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'j4', journal_name: 'Bank Journal', journal_type: 'Bank', code: 'BNK', is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'j5', journal_name: 'General Journal', journal_type: 'General', code: 'GEN', is_active: true, created_at: '2026-01-01T00:00:00Z' },
];

export function getJournals() {
  return readJson('journals.json', DEFAULT_JOURNALS);
}
export function saveJournals(data: unknown[]) {
  writeJson('journals.json', data);
}

// ─── Journal Entries ─────────────────────────────────────────────────────────
const DEFAULT_JOURNAL_ENTRIES = [
  { id: 'je1', entry_number: 'JE-2026-0001', journal_id: 'j1', journal_name: 'Sales Journal', entry_date: '2026-08-01', reference: 'INV-2026-0001', narration: 'Sales to Rajesh Sharma', status: 'Posted', total_debit: 45000, total_credit: 45000, created_at: '2026-08-01T10:00:00Z' },
  { id: 'je2', entry_number: 'JE-2026-0002', journal_id: 'j2', journal_name: 'Purchase Journal', entry_date: '2026-08-05', reference: 'BILL-2026-0001', narration: 'Purchase from Priya Logistics', status: 'Posted', total_debit: 28000, total_credit: 28000, created_at: '2026-08-05T10:00:00Z' },
  { id: 'je3', entry_number: 'JE-2026-0003', journal_id: 'j4', journal_name: 'Bank Journal', entry_date: '2026-08-10', reference: 'PAY-2026-0001', narration: 'Payment received from Zenith Holdings', status: 'Posted', total_debit: 72500, total_credit: 72500, created_at: '2026-08-10T10:00:00Z' },
  { id: 'je4', entry_number: 'JE-2026-0004', journal_id: 'j5', journal_name: 'General Journal', entry_date: '2026-08-15', reference: 'ADJ-001', narration: 'Monthly depreciation adjustment', status: 'Draft', total_debit: 5000, total_credit: 5000, created_at: '2026-08-15T10:00:00Z' },
];

export function getJournalEntries() {
  return readJson('journal-entries.json', DEFAULT_JOURNAL_ENTRIES);
}
export function saveJournalEntries(data: unknown[]) {
  writeJson('journal-entries.json', data);
}

// ─── Products ─────────────────────────────────────────────────────────────────
const DEFAULT_PRODUCTS = [
  { id: 'p1', name: 'Teak Wood Chair', sku: 'TWC-001', category: 'Furniture', unit: 'Nos', purchase_price: 2500, sale_price: 4200, tax_rate: 18, is_archived: false, created_at: '2026-01-20T10:00:00Z' },
  { id: 'p2', name: 'Wooden Dining Table', sku: 'WDT-002', category: 'Furniture', unit: 'Nos', purchase_price: 12000, sale_price: 18500, tax_rate: 18, is_archived: false, created_at: '2026-01-25T10:00:00Z' },
  { id: 'p3', name: 'Steel Almirah', sku: 'SA-003', category: 'Storage', unit: 'Nos', purchase_price: 8000, sale_price: 12000, tax_rate: 18, is_archived: false, created_at: '2026-02-01T10:00:00Z' },
  { id: 'p4', name: 'Office Desk', sku: 'OD-004', category: 'Office', unit: 'Nos', purchase_price: 5500, sale_price: 8800, tax_rate: 18, is_archived: false, created_at: '2026-02-10T10:00:00Z' },
  { id: 'p5', name: 'Sofa Set (3+1+1)', sku: 'SS-005', category: 'Furniture', unit: 'Set', purchase_price: 22000, sale_price: 35000, tax_rate: 18, is_archived: false, created_at: '2026-02-15T10:00:00Z' },
];

export function getProducts() {
  return readJson('products.json', DEFAULT_PRODUCTS);
}
export function saveProducts(data: unknown[]) {
  writeJson('products.json', data);
}

// ─── Budgets ─────────────────────────────────────────────────────────────────
const DEFAULT_BUDGETS = [
  { id: 'b1', budget_name: 'FY 2026-27 Operating Budget', fiscal_year: '2026-27', total_amount: 2000000, spent_amount: 450000, status: 'Active', start_date: '2026-04-01', end_date: '2027-03-31', created_at: '2026-04-01T10:00:00Z' },
  { id: 'b2', budget_name: 'Q2 Marketing Budget', fiscal_year: '2026-27', total_amount: 200000, spent_amount: 85000, status: 'Active', start_date: '2026-07-01', end_date: '2026-09-30', created_at: '2026-07-01T10:00:00Z' },
  { id: 'b3', budget_name: 'Infrastructure Capex', fiscal_year: '2026-27', total_amount: 500000, spent_amount: 500000, status: 'Exhausted', start_date: '2026-04-01', end_date: '2026-06-30', created_at: '2026-04-01T10:00:00Z' },
];

export function getBudgets() {
  return readJson('budgets.json', DEFAULT_BUDGETS);
}
export function saveBudgets(data: unknown[]) {
  writeJson('budgets.json', data);
}

// ─── Sales Orders ─────────────────────────────────────────────────────────────
const DEFAULT_SALES_ORDERS = [
  { id: 'so1', order_number: 'SO-2026-0001', customer_id: 'c1', customer_name: 'Rajesh Sharma', order_date: '2026-08-01', delivery_date: '2026-08-15', status: 'Confirmed', subtotal: 38135, tax_amount: 6864, total_amount: 45000, notes: '10 Teak Wood Chairs', created_at: '2026-08-01T10:00:00Z' },
  { id: 'so2', order_number: 'SO-2026-0002', customer_id: 'c5', customer_name: 'Zenith Holdings Corp', order_date: '2026-08-10', delivery_date: '2026-08-30', status: 'Invoiced', subtotal: 61440, tax_amount: 11059, total_amount: 72500, notes: 'Office desks and chairs', created_at: '2026-08-10T10:00:00Z' },
  { id: 'so3', order_number: 'SO-2026-0003', customer_id: 'c3', customer_name: 'TimberCraft Studio', order_date: '2026-09-01', delivery_date: '2026-09-20', status: 'Draft', subtotal: 27966, tax_amount: 5033, total_amount: 33000, notes: 'Sofa sets - 1 unit', created_at: '2026-09-01T10:00:00Z' },
];

export function getSalesOrders() {
  return readJson('sales-orders.json', DEFAULT_SALES_ORDERS);
}
export function saveSalesOrders(data: unknown[]) {
  writeJson('sales-orders.json', data);
}

// ─── Purchase Orders ──────────────────────────────────────────────────────────
const DEFAULT_PURCHASE_ORDERS = [
  { id: 'po1', order_number: 'PO-2026-0001', vendor_id: 'c2', vendor_name: 'Priya Logistics Ltd', order_date: '2026-08-03', expected_date: '2026-08-20', status: 'Received', subtotal: 23729, tax_amount: 4271, total_amount: 28000, notes: 'Timber supply', created_at: '2026-08-03T10:00:00Z' },
  { id: 'po2', order_number: 'PO-2026-0002', vendor_id: 'c4', vendor_name: 'Anil Steel Suppliers', order_date: '2026-08-18', expected_date: '2026-09-05', status: 'Confirmed', subtotal: 45762, tax_amount: 8238, total_amount: 54000, notes: 'Steel fittings bulk', created_at: '2026-08-18T10:00:00Z' },
  { id: 'po3', order_number: 'PO-2026-0003', vendor_id: 'c2', vendor_name: 'Priya Logistics Ltd', order_date: '2026-09-01', expected_date: '2026-09-15', status: 'Draft', subtotal: 10593, tax_amount: 1906, total_amount: 12500, notes: 'Packaging materials', created_at: '2026-09-01T10:00:00Z' },
];

export function getPurchaseOrders() {
  return readJson('purchase-orders.json', DEFAULT_PURCHASE_ORDERS);
}
export function savePurchaseOrders(data: unknown[]) {
  writeJson('purchase-orders.json', data);
}

// ─── Customer Invoices ────────────────────────────────────────────────────────
const DEFAULT_CUSTOMER_INVOICES = [
  { id: 'ci1', invoice_number: 'INV-2026-0001', customer_id: 'c1', customer_name: 'Rajesh Sharma', customer_email: 'rajesh@example.com', invoice_date: '2026-08-01', due_date: '2026-08-31', status: 'Paid', subtotal: 38135, tax_amount: 6864, total_amount: 45000, paid_amount: 45000, balance_due: 0, notes: 'Office furniture supply', sales_order_id: 'so1', created_at: '2026-08-01T10:00:00Z' },
  { id: 'ci2', invoice_number: 'INV-2026-0002', customer_id: 'c5', customer_name: 'Zenith Holdings Corp', customer_email: 'contact@zenith.com', invoice_date: '2026-08-15', due_date: '2026-09-15', status: 'Sent', subtotal: 61440, tax_amount: 11059, total_amount: 72500, paid_amount: 0, balance_due: 72500, notes: 'Wooden chairs - 50 units', sales_order_id: 'so2', created_at: '2026-08-15T10:00:00Z' },
  { id: 'ci3', invoice_number: 'INV-2026-0003', customer_id: 'c3', customer_name: 'TimberCraft Studio', customer_email: 'info@timbercraft.in', invoice_date: '2026-07-10', due_date: '2026-08-10', status: 'Overdue', subtotal: 15254, tax_amount: 2745, total_amount: 18000, paid_amount: 0, balance_due: 18000, notes: 'Cabinet assembly', sales_order_id: null, created_at: '2026-07-10T10:00:00Z' },
];

export function getCustomerInvoices() {
  return readJson('customer-invoices.json', DEFAULT_CUSTOMER_INVOICES);
}
export function saveCustomerInvoices(data: unknown[]) {
  writeJson('customer-invoices.json', data);
}

// ─── Vendor Bills ─────────────────────────────────────────────────────────────
const DEFAULT_VENDOR_BILLS = [
  { id: 'vb1', bill_number: 'BILL-2026-0001', vendor_id: 'c2', vendor_name: 'Priya Logistics Ltd', vendor_email: 'priya@logistics.com', bill_date: '2026-08-05', due_date: '2026-09-05', status: 'Paid', subtotal: 23729, tax_amount: 4271, total_amount: 28000, paid_amount: 28000, balance_due: 0, notes: 'Raw timber supply', purchase_order_id: 'po1', created_at: '2026-08-05T10:00:00Z' },
  { id: 'vb2', bill_number: 'BILL-2026-0002', vendor_id: 'c4', vendor_name: 'Anil Steel Suppliers', vendor_email: 'anil@steel.com', bill_date: '2026-08-20', due_date: '2026-09-20', status: 'Received', subtotal: 45762, tax_amount: 8238, total_amount: 54000, paid_amount: 0, balance_due: 54000, notes: 'Steel fittings - bulk order', purchase_order_id: 'po2', created_at: '2026-08-20T10:00:00Z' },
  { id: 'vb3', bill_number: 'BILL-2026-0003', vendor_id: 'c2', vendor_name: 'Priya Logistics Ltd', vendor_email: 'priya@logistics.com', bill_date: '2026-07-15', due_date: '2026-08-15', status: 'Overdue', subtotal: 10593, tax_amount: 1906, total_amount: 12500, paid_amount: 0, balance_due: 12500, notes: 'Packaging materials', purchase_order_id: null, created_at: '2026-07-15T10:00:00Z' },
];

export function getVendorBills() {
  return readJson('vendor-bills.json', DEFAULT_VENDOR_BILLS);
}
export function saveVendorBills(data: unknown[]) {
  writeJson('vendor-bills.json', data);
}

// ─── Payments ─────────────────────────────────────────────────────────────────
const DEFAULT_PAYMENTS = [
  { id: 'pay1', payment_number: 'PAY-2026-0001', payment_type: 'Receipt', payment_method: 'Bank Transfer', partner_id: 'c1', partner_name: 'Rajesh Sharma', payment_date: '2026-08-28', amount: 45000, reference_number: 'UTR123456789', notes: 'Full payment for INV-2026-0001', status: 'Completed', created_at: '2026-08-28T10:00:00Z' },
  { id: 'pay2', payment_number: 'PAY-2026-0002', payment_type: 'Payment', payment_method: 'UPI', partner_id: 'c2', partner_name: 'Priya Logistics Ltd', payment_date: '2026-08-20', amount: 28000, reference_number: 'UPI20260820', notes: 'Settlement of BILL-2026-0001', status: 'Completed', created_at: '2026-08-20T10:00:00Z' },
];

export function getPayments() {
  return readJson('payments.json', DEFAULT_PAYMENTS);
}
export function savePayments(data: unknown[]) {
  writeJson('payments.json', data);
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
export function getDashboardStats() {
  const invoices = getCustomerInvoices();
  const bills = getVendorBills();
  const payments = getPayments();

  const totalRevenue = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + i.total_amount, 0);
  const totalExpenses = bills.filter(b => b.status === 'Paid').reduce((s, b) => s + b.total_amount, 0);
  const netProfit = totalRevenue - totalExpenses;
  const accountsReceivable = invoices.filter(i => i.status !== 'Paid' && i.status !== 'Cancelled').reduce((s, i) => s + i.balance_due, 0);
  const accountsPayable = bills.filter(b => b.status !== 'Paid' && b.status !== 'Cancelled').reduce((s, b) => s + b.balance_due, 0);

  return {
    totalRevenue,
    totalExpenses,
    netProfit,
    accountsReceivable,
    accountsPayable,
    cashBalance: 750000,
    pendingInvoices: invoices.filter(i => i.status === 'Sent' || i.status === 'Overdue').length,
    overdueInvoices: invoices.filter(i => i.status === 'Overdue').length,
  };
}
