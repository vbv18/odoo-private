import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

export interface StoredPayment {
  id: string;
  payment_number: string;
  payment_type: 'Receipt' | 'Payment';
  payment_method: string;
  partner_id?: string | null;
  partner_name?: string | null;
  partner_email?: string | null;
  payment_date: string;
  amount: number;
  reference_type?: string | null;
  reference_id?: string | null;
  reference_number?: string | null;
  notes?: string | null;
  status: 'Completed' | 'Pending' | 'Draft';
  created_at: string;
  created_by?: string | null;
}

const dataDir = path.join(process.cwd(), 'data');
const filePath = path.join(dataDir, 'payments.json');

const INITIAL_PAYMENTS: StoredPayment[] = [
  {
    id: '1',
    payment_number: 'PAY-2026-0001',
    payment_type: 'Payment',
    payment_method: 'Bank Transfer',
    partner_id: 'cust-1',
    partner_name: 'Acme Corp',
    payment_date: '2026-08-28',
    amount: 45000,
    reference_type: 'Invoice',
    reference_number: 'INV-2026-0001',
    notes: 'Invoice INV-2026-0001 settlement',
    status: 'Completed',
    created_at: '2026-08-28T14:30:00.000Z'
  },
  {
    id: '2',
    payment_number: 'PAY-2026-0002',
    payment_type: 'Payment',
    payment_method: 'UPI',
    partner_id: 'cust-2',
    partner_name: 'TechFlow Solutions',
    payment_date: '2026-08-20',
    amount: 28000,
    reference_type: 'Bill',
    reference_number: 'BILL-2026-0001',
    notes: 'Bill BILL-2026-0001 settlement',
    status: 'Completed',
    created_at: '2026-08-20T11:15:00.000Z'
  }
];

export function readStoredPayments(): StoredPayment[] {
  try {
    if (!fs.existsSync(filePath)) {
      writeStoredPayments(INITIAL_PAYMENTS);
      return INITIAL_PAYMENTS;
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data) as StoredPayment[];
  } catch (err) {
    return INITIAL_PAYMENTS;
  }
}

export function writeStoredPayments(payments: StoredPayment[]): void {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(payments, null, 2));
  } catch (err) {
    console.error('Error writing payments:', err);
  }
}

export function getStoredPayments(type?: string): StoredPayment[] {
  const all = readStoredPayments();
  if (type && (type === 'Receipt' || type === 'Payment')) {
    return all.filter((p) => p.payment_type === type);
  }
  return all;
}

export function getStoredPaymentById(id: string): StoredPayment | undefined {
  const all = readStoredPayments();
  return all.find((p) => p.id === id || p.payment_number === id);
}

export function saveStoredPayment(input: {
  payment_type: 'Receipt' | 'Payment';
  payment_method: string;
  partner_id?: string | null;
  partner_name?: string | null;
  partner_email?: string | null;
  payment_date: string;
  amount: number;
  reference_type?: string | null;
  reference_id?: string | null;
  reference_number?: string | null;
  notes?: string | null;
  created_by?: string | null;
}): StoredPayment {
  const payments = readStoredPayments();
  const prefix = input.payment_type === 'Receipt' ? 'REC' : 'PAY';
  const nextSeq = payments.length + 1;
  const paymentNumber = `${prefix}-${new Date().getFullYear()}-${String(nextSeq).padStart(4, '0')}`;

  const newPayment: StoredPayment = {
    id: randomUUID(),
    payment_number: paymentNumber,
    payment_type: input.payment_type,
    payment_method: input.payment_method || 'Bank Transfer',
    partner_id: input.partner_id || null,
    partner_name: input.partner_name || 'Customer',
    partner_email: input.partner_email || null,
    payment_date: input.payment_date || new Date().toISOString().split('T')[0],
    amount: Number(input.amount),
    reference_type: input.reference_type || 'Manual',
    reference_id: input.reference_id || null,
    reference_number: input.reference_number || null,
    notes: input.notes || null,
    status: 'Completed',
    created_at: new Date().toISOString(),
    created_by: input.created_by || null,
  };

  payments.unshift(newPayment);
  writeStoredPayments(payments);
  return newPayment;
}
