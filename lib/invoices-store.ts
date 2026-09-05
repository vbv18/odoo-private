import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

export interface StoredInvoiceItem {
  id: string;
  product_id?: string | null;
  product_name?: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
}

export interface StoredInvoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer_name: string;
  customer_email?: string;
  customer_mobile?: string;
  customer_address?: string;
  invoice_date: string;
  due_date: string;
  status: 'Draft' | 'Sent' | 'Posted' | 'Paid' | 'Overdue' | 'Cancelled';
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  notes?: string | null;
  created_at: string;
  created_by?: string | null;
  sales_order_id?: string | null;
  items?: StoredInvoiceItem[];
  payments?: any[];
}

const dataDir = path.join(process.cwd(), 'data');
const filePath = path.join(dataDir, 'invoices.json');

const INITIAL_INVOICES: StoredInvoice[] = [
  {
    id: '1',
    invoice_number: 'INV-2026-0001',
    customer_id: 'cust-1',
    customer_name: 'Acme Corp',
    customer_email: 'billing@acme.com',
    invoice_date: '2026-08-01',
    due_date: '2026-08-31',
    status: 'Paid',
    subtotal: 38135.59,
    tax_amount: 6864.41,
    total_amount: 45000,
    paid_amount: 45000,
    balance_due: 0,
    notes: 'Office furniture supply',
    created_at: '2026-08-01T10:00:00.000Z',
    items: [
      { id: 'item-1', description: 'Ergonomic Desk Chair', quantity: 5, unit_price: 7627.12, tax_rate: 18 }
    ],
    payments: [
      { id: 'pay-1', payment_number: 'PAY-2026-0001', amount: 45000, payment_date: '2026-08-28', payment_method: 'Bank Transfer' }
    ]
  },
  {
    id: '2',
    invoice_number: 'INV-2026-0002',
    customer_id: 'cust-2',
    customer_name: 'TechFlow Solutions',
    customer_email: 'accounts@techflow.io',
    invoice_date: '2026-08-15',
    due_date: '2026-09-15',
    status: 'Sent',
    subtotal: 61440.68,
    tax_amount: 11059.32,
    total_amount: 72500,
    paid_amount: 0,
    balance_due: 72500,
    notes: 'Wooden conference table - 1 unit',
    created_at: '2026-08-15T11:00:00.000Z',
    items: [
      { id: 'item-2', description: 'Oak Wood Conference Table', quantity: 1, unit_price: 61440.68, tax_rate: 18 }
    ],
    payments: []
  },
  {
    id: '3',
    invoice_number: 'INV-2026-0003',
    customer_id: 'cust-3',
    customer_name: 'Nexus Dynamics',
    customer_email: 'nexus@example.com',
    invoice_date: '2026-07-10',
    due_date: '2026-08-10',
    status: 'Overdue',
    subtotal: 15254.24,
    tax_amount: 2745.76,
    total_amount: 18000,
    paid_amount: 0,
    balance_due: 18000,
    notes: 'Storage cabinets assembly',
    created_at: '2026-07-10T09:00:00.000Z',
    items: [
      { id: 'item-3', description: 'Modular Storage Cabinet', quantity: 2, unit_price: 7627.12, tax_rate: 18 }
    ],
    payments: []
  }
];

export function readStoredInvoices(): StoredInvoice[] {
  try {
    if (!fs.existsSync(filePath)) {
      writeStoredInvoices(INITIAL_INVOICES);
      return INITIAL_INVOICES;
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data) as StoredInvoice[];
  } catch (err) {
    return INITIAL_INVOICES;
  }
}

export function writeStoredInvoices(invoices: StoredInvoice[]): void {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(invoices, null, 2));
  } catch (err) {
    console.error('Error writing invoices:', err);
  }
}

export function getStoredInvoices(): StoredInvoice[] {
  return readStoredInvoices();
}

export function getStoredInvoiceById(id: string): StoredInvoice | undefined {
  const invoices = readStoredInvoices();
  return invoices.find((inv) => inv.id === id || inv.invoice_number === id);
}

export function saveStoredInvoice(input: {
  customer_id: string;
  customer_name?: string;
  invoice_date: string;
  due_date: string;
  notes?: string;
  items: Array<{
    product_id?: string;
    product_name?: string;
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate: number;
  }>;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  paid_amount?: number;
  balance_due?: number;
  status?: StoredInvoice['status'];
  created_by?: string;
}): StoredInvoice {
  const invoices = readStoredInvoices();
  const nextSeq = invoices.length + 1;
  const invoiceNumber = `INV-${new Date().getFullYear()}-${String(nextSeq).padStart(4, '0')}`;

  const lineItems: StoredInvoiceItem[] = input.items.map((it) => ({
    id: randomUUID(),
    product_id: it.product_id || null,
    product_name: it.product_name || it.description,
    description: it.description || 'Line item',
    quantity: Number(it.quantity) || 1,
    unit_price: Number(it.unit_price) || 0,
    tax_rate: Number(it.tax_rate) || 0,
  }));

  const paid = input.paid_amount || 0;
  const total = input.total_amount;
  const balance = total - paid;

  const newInvoice: StoredInvoice = {
    id: randomUUID(),
    invoice_number: invoiceNumber,
    customer_id: input.customer_id,
    customer_name: input.customer_name || 'Valued Customer',
    invoice_date: input.invoice_date,
    due_date: input.due_date,
    status: input.status || (paid >= total ? 'Paid' : 'Draft'),
    subtotal: input.subtotal,
    tax_amount: input.tax_amount,
    total_amount: total,
    paid_amount: paid,
    balance_due: balance,
    notes: input.notes || null,
    created_at: new Date().toISOString(),
    created_by: input.created_by || null,
    items: lineItems,
    payments: [],
  };

  invoices.unshift(newInvoice);
  writeStoredInvoices(invoices);
  return newInvoice;
}

export function updateStoredInvoice(id: string, updates: Partial<StoredInvoice>): StoredInvoice | undefined {
  const invoices = readStoredInvoices();
  const index = invoices.findIndex((inv) => inv.id === id || inv.invoice_number === id);
  if (index === -1) return undefined;

  invoices[index] = { ...invoices[index], ...updates };
  writeStoredInvoices(invoices);
  return invoices[index];
}
