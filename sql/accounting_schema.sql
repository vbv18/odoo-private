-- ============================================================================
-- URBAN FURNITURE ACCOUNTING SYSTEM - COMPLETE DATABASE SCHEMA
-- ============================================================================

-- ============================================================================
-- 1. MASTER DATA TABLES
-- ============================================================================

-- 1.1 Contacts Master (Customers, Vendors, Both)
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  contact_type VARCHAR(20) NOT NULL CHECK (contact_type IN ('Customer', 'Vendor', 'Both')),
  email VARCHAR(255) UNIQUE,
  mobile VARCHAR(20),
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  address TEXT,
  profile_image_url TEXT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Link to user if Contact can login
  is_archived BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_contacts_type ON contacts(contact_type);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_archived ON contacts(is_archived);

-- 1.2 Product Master (Goods, Service, Combo)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name VARCHAR(255) NOT NULL,
  product_type VARCHAR(20) NOT NULL CHECK (product_type IN ('Goods', 'Service', 'Combo')),
  sales_price DECIMAL(15, 2) NOT NULL DEFAULT 0,
  cost_price DECIMAL(15, 2) NOT NULL DEFAULT 0, -- Purchase price
  category VARCHAR(100),
  description TEXT,
  sku VARCHAR(100) UNIQUE,
  stock_quantity DECIMAL(15, 2) DEFAULT 0, -- For Goods only
  unit_of_measure VARCHAR(50) DEFAULT 'Unit',
  is_archived BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_type ON products(product_type);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_archived ON products(is_archived);

-- 1.3 Chart of Accounts Master
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code VARCHAR(50) UNIQUE NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('Asset', 'Liability', 'Expense', 'Income', 'Capital')),
  parent_account_id UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  is_system_account BOOLEAN DEFAULT FALSE, -- System accounts cannot be deleted
  opening_balance DECIMAL(15, 2) DEFAULT 0,
  current_balance DECIMAL(15, 2) DEFAULT 0,
  is_archived BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_coa_type ON chart_of_accounts(account_type);
CREATE INDEX idx_coa_code ON chart_of_accounts(account_code);
CREATE INDEX idx_coa_archived ON chart_of_accounts(is_archived);

-- 1.4 Journals Master
CREATE TABLE IF NOT EXISTS journals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_name VARCHAR(255) NOT NULL,
  journal_type VARCHAR(50) NOT NULL CHECK (journal_type IN ('Sales', 'Purchase', 'Bank', 'Cash', 'General')),
  default_debit_account_id UUID REFERENCES chart_of_accounts(id),
  default_credit_account_id UUID REFERENCES chart_of_accounts(id),
  description TEXT,
  is_archived BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_journals_type ON journals(journal_type);
CREATE INDEX idx_journals_archived ON journals(is_archived);

-- 1.5 Analytic Accounts (for Budget tracking)
CREATE TABLE IF NOT EXISTS analytic_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_name VARCHAR(255) NOT NULL,
  account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('Income', 'Expenses')),
  description TEXT,
  is_archived BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_analytic_type ON analytic_accounts(account_type);

-- 1.6 Budgets
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_name VARCHAR(255) NOT NULL,
  analytic_account_id UUID REFERENCES analytic_accounts(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  planned_amount DECIMAL(15, 2) NOT NULL,
  achieved_amount DECIMAL(15, 2) DEFAULT 0,
  advanced_amount DECIMAL(15, 2) DEFAULT 0,
  responsible_person UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Closed', 'Over Budget')),
  is_archived BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_budgets_period ON budgets(period_start, period_end);
CREATE INDEX idx_budgets_analytic ON budgets(analytic_account_id);
CREATE INDEX idx_budgets_status ON budgets(status);

-- ============================================================================
-- 2. TRANSACTION TABLES
-- ============================================================================

-- 2.1 Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number VARCHAR(50) UNIQUE NOT NULL,
  vendor_id UUID REFERENCES contacts(id) ON DELETE RESTRICT,
  po_date DATE NOT NULL,
  expected_delivery_date DATE,
  status VARCHAR(20) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Confirmed', 'Received', 'Cancelled')),
  subtotal DECIMAL(15, 2) DEFAULT 0,
  tax_amount DECIMAL(15, 2) DEFAULT 0,
  total_amount DECIMAL(15, 2) DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_po_vendor ON purchase_orders(vendor_id);
CREATE INDEX idx_po_status ON purchase_orders(status);
CREATE INDEX idx_po_date ON purchase_orders(po_date);

-- 2.2 Purchase Order Line Items
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
  description TEXT,
  quantity DECIMAL(15, 2) NOT NULL,
  unit_price DECIMAL(15, 2) NOT NULL,
  tax_rate DECIMAL(5, 2) DEFAULT 0,
  line_total DECIMAL(15, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  received_quantity DECIMAL(15, 2) DEFAULT 0
);

CREATE INDEX idx_po_items_order ON purchase_order_items(purchase_order_id);
CREATE INDEX idx_po_items_product ON purchase_order_items(product_id);

-- 2.3 Vendor Bills
CREATE TABLE IF NOT EXISTS vendor_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_number VARCHAR(50) UNIQUE NOT NULL,
  vendor_id UUID REFERENCES contacts(id) ON DELETE RESTRICT,
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
  bill_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Posted', 'Paid', 'Cancelled')),
  subtotal DECIMAL(15, 2) DEFAULT 0,
  tax_amount DECIMAL(15, 2) DEFAULT 0,
  total_amount DECIMAL(15, 2) DEFAULT 0,
  paid_amount DECIMAL(15, 2) DEFAULT 0,
  balance_due DECIMAL(15, 2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
  notes TEXT,
  journal_entry_id UUID REFERENCES journal_entries(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bills_vendor ON vendor_bills(vendor_id);
CREATE INDEX idx_bills_status ON vendor_bills(status);
CREATE INDEX idx_bills_due_date ON vendor_bills(due_date);

-- 2.4 Vendor Bill Line Items
CREATE TABLE IF NOT EXISTS vendor_bill_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_bill_id UUID REFERENCES vendor_bills(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
  description TEXT,
  quantity DECIMAL(15, 2) NOT NULL,
  unit_price DECIMAL(15, 2) NOT NULL,
  tax_rate DECIMAL(5, 2) DEFAULT 0,
  line_total DECIMAL(15, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  analytic_account_id UUID REFERENCES analytic_accounts(id)
);

CREATE INDEX idx_bill_items_bill ON vendor_bill_items(vendor_bill_id);
CREATE INDEX idx_bill_items_product ON vendor_bill_items(product_id);

-- 2.5 Sales Orders
CREATE TABLE IF NOT EXISTS sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  so_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id UUID REFERENCES contacts(id) ON DELETE RESTRICT,
  so_date DATE NOT NULL,
  expected_delivery_date DATE,
  status VARCHAR(20) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Confirmed', 'Delivered', 'Cancelled')),
  subtotal DECIMAL(15, 2) DEFAULT 0,
  tax_amount DECIMAL(15, 2) DEFAULT 0,
  total_amount DECIMAL(15, 2) DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_so_customer ON sales_orders(customer_id);
CREATE INDEX idx_so_status ON sales_orders(status);
CREATE INDEX idx_so_date ON sales_orders(so_date);

-- 2.6 Sales Order Line Items
CREATE TABLE IF NOT EXISTS sales_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id UUID REFERENCES sales_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
  description TEXT,
  quantity DECIMAL(15, 2) NOT NULL,
  unit_price DECIMAL(15, 2) NOT NULL,
  tax_rate DECIMAL(5, 2) DEFAULT 0,
  line_total DECIMAL(15, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  delivered_quantity DECIMAL(15, 2) DEFAULT 0
);

CREATE INDEX idx_so_items_order ON sales_order_items(sales_order_id);
CREATE INDEX idx_so_items_product ON sales_order_items(product_id);

-- 2.7 Customer Invoices
CREATE TABLE IF NOT EXISTS customer_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id UUID REFERENCES contacts(id) ON DELETE RESTRICT,
  sales_order_id UUID REFERENCES sales_orders(id) ON DELETE SET NULL,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Sent', 'Posted', 'Paid', 'Overdue', 'Cancelled')),
  subtotal DECIMAL(15, 2) DEFAULT 0,
  tax_amount DECIMAL(15, 2) DEFAULT 0,
  total_amount DECIMAL(15, 2) DEFAULT 0,
  paid_amount DECIMAL(15, 2) DEFAULT 0,
  balance_due DECIMAL(15, 2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
  notes TEXT,
  journal_entry_id UUID REFERENCES journal_entries(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_invoices_customer ON customer_invoices(customer_id);
CREATE INDEX idx_invoices_status ON customer_invoices(status);
CREATE INDEX idx_invoices_due_date ON customer_invoices(due_date);

-- 2.8 Customer Invoice Line Items
CREATE TABLE IF NOT EXISTS customer_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_invoice_id UUID REFERENCES customer_invoices(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
  description TEXT,
  quantity DECIMAL(15, 2) NOT NULL,
  unit_price DECIMAL(15, 2) NOT NULL,
  tax_rate DECIMAL(15, 2) DEFAULT 0,
  line_total DECIMAL(15, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  analytic_account_id UUID REFERENCES analytic_accounts(id)
);

CREATE INDEX idx_invoice_items_invoice ON customer_invoice_items(customer_invoice_id);
CREATE INDEX idx_invoice_items_product ON customer_invoice_items(product_id);

-- ============================================================================
-- 3. JOURNAL ENTRIES & ACCOUNTING
-- ============================================================================

-- 3.1 Journal Entries (Main accounting record)
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number VARCHAR(50) UNIQUE NOT NULL,
  journal_id UUID REFERENCES journals(id) ON DELETE RESTRICT,
  entry_date DATE NOT NULL,
  reference_type VARCHAR(50), -- 'Invoice', 'Bill', 'Payment', 'Manual'
  reference_id UUID, -- ID of related document
  reference_number VARCHAR(100),
  description TEXT,
  status VARCHAR(20) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Posted', 'Reversed')),
  total_debit DECIMAL(15, 2) DEFAULT 0,
  total_credit DECIMAL(15, 2) DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_balanced CHECK (total_debit = total_credit OR status = 'Draft')
);

CREATE INDEX idx_je_journal ON journal_entries(journal_id);
CREATE INDEX idx_je_date ON journal_entries(entry_date);
CREATE INDEX idx_je_status ON journal_entries(status);
CREATE INDEX idx_je_reference ON journal_entries(reference_type, reference_id);

-- 3.2 Journal Entry Line Items (Debit/Credit lines)
CREATE TABLE IF NOT EXISTS journal_entry_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  description TEXT,
  debit_amount DECIMAL(15, 2) DEFAULT 0,
  credit_amount DECIMAL(15, 2) DEFAULT 0,
  analytic_account_id UUID REFERENCES analytic_accounts(id),
  partner_id UUID REFERENCES contacts(id),
  CONSTRAINT check_debit_or_credit CHECK (
    (debit_amount > 0 AND credit_amount = 0) OR 
    (credit_amount > 0 AND debit_amount = 0)
  )
);

CREATE INDEX idx_jei_entry ON journal_entry_items(journal_entry_id);
CREATE INDEX idx_jei_account ON journal_entry_items(account_id);
CREATE INDEX idx_jei_analytic ON journal_entry_items(analytic_account_id);

-- ============================================================================
-- 4. PAYMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number VARCHAR(50) UNIQUE NOT NULL,
  payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('Receipt', 'Payment')), -- Receipt from customer, Payment to vendor
  payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('Cash', 'Bank', 'Cheque', 'UPI', 'Card')),
  partner_id UUID REFERENCES contacts(id) ON DELETE RESTRICT,
  payment_date DATE NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  reference_type VARCHAR(50), -- 'Invoice' or 'Bill'
  reference_id UUID, -- customer_invoices.id or vendor_bills.id
  reference_number VARCHAR(100),
  bank_account_id UUID REFERENCES bank_accounts(id),
  notes TEXT,
  journal_entry_id UUID REFERENCES journal_entries(id),
  status VARCHAR(20) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Posted', 'Cancelled')),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_partner ON payments(partner_id);
CREATE INDEX idx_payments_type ON payments(payment_type);
CREATE INDEX idx_payments_date ON payments(payment_date);
CREATE INDEX idx_payments_reference ON payments(reference_type, reference_id);

-- ============================================================================
-- 5. DEFAULT CHART OF ACCOUNTS (System Accounts)
-- ============================================================================

-- Insert default CoA structure
INSERT INTO chart_of_accounts (account_code, account_name, account_type, is_system_account, current_balance) VALUES
-- Assets
('1000', 'Assets', 'Asset', TRUE, 0),
('1100', 'Current Assets', 'Asset', TRUE, 0),
('1110', 'Cash', 'Asset', TRUE, 0),
('1120', 'Bank', 'Asset', TRUE, 0),
('1130', 'Accounts Receivable (Debtors)', 'Asset', TRUE, 0),
('1140', 'Inventory', 'Asset', TRUE, 0),
('1200', 'Fixed Assets', 'Asset', TRUE, 0),
('1210', 'Furniture & Fixtures', 'Asset', TRUE, 0),
('1220', 'Equipment', 'Asset', TRUE, 0),

-- Liabilities
('2000', 'Liabilities', 'Liability', TRUE, 0),
('2100', 'Current Liabilities', 'Liability', TRUE, 0),
('2110', 'Accounts Payable (Creditors)', 'Liability', TRUE, 0),
('2120', 'Tax Payable', 'Liability', TRUE, 0),

-- Capital
('3000', 'Capital', 'Capital', TRUE, 0),
('3100', 'Owner''s Capital', 'Capital', TRUE, 0),
('3200', 'Retained Earnings', 'Capital', TRUE, 0),

-- Income
('4000', 'Income', 'Income', TRUE, 0),
('4100', 'Sales Revenue', 'Income', TRUE, 0),
('4200', 'Service Revenue', 'Income', TRUE, 0),
('4300', 'Other Income', 'Income', TRUE, 0),

-- Expenses
('5000', 'Expenses', 'Expense', TRUE, 0),
('5100', 'Cost of Goods Sold', 'Expense', TRUE, 0),
('5200', 'Purchase Expenses', 'Expense', TRUE, 0),
('5300', 'Operating Expenses', 'Expense', TRUE, 0),
('5310', 'Salaries & Wages', 'Expense', TRUE, 0),
('5320', 'Rent', 'Expense', TRUE, 0),
('5330', 'Utilities', 'Expense', TRUE, 0),
('5340', 'Marketing & Advertising', 'Expense', TRUE, 0),
('5350', 'Office Supplies', 'Expense', TRUE, 0)
ON CONFLICT (account_code) DO NOTHING;

-- ============================================================================
-- 6. DEFAULT JOURNALS
-- ============================================================================

INSERT INTO journals (journal_name, journal_type, description) VALUES
('Sales Journal', 'Sales', 'Records all customer invoices and sales transactions'),
('Purchase Journal', 'Purchase', 'Records all vendor bills and purchase transactions'),
('Bank Journal', 'Bank', 'Records all bank-related transactions'),
('Cash Journal', 'Cash', 'Records all cash receipts and payments'),
('General Journal', 'General', 'Manual accounting entries and adjustments')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 7. SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Sample Contacts
INSERT INTO contacts (name, contact_type, email, mobile, city, state, pincode) VALUES
('Azure Furniture', 'Vendor', 'contact@azurefurniture.com', '9876543210', 'Mumbai', 'Maharashtra', '400001'),
('Nimesh Pathak', 'Customer', 'nimesh@example.com', '9123456789', 'Delhi', 'Delhi', '110001'),
('Rahul Sharma', 'Vendor', 'rahul@vendor.com', '9988776655', 'Bangalore', 'Karnataka', '560001'),
('Priya Industries', 'Both', 'priya@industries.com', '9876543211', 'Pune', 'Maharashtra', '411001')
ON CONFLICT DO NOTHING;

-- Sample Products
INSERT INTO products (product_name, product_type, sales_price, cost_price, category, sku) VALUES
('Office Chair', 'Goods', 5500.00, 3500.00, 'Furniture', 'FURN-OC-001'),
('Wooden Table', 'Goods', 12000.00, 8000.00, 'Furniture', 'FURN-WT-001'),
('Sofa', 'Goods', 25000.00, 18000.00, 'Furniture', 'FURN-SF-001'),
('Dining Table', 'Goods', 18000.00, 12000.00, 'Furniture', 'FURN-DT-001'),
('Installation Service', 'Service', 2000.00, 1000.00, 'Services', 'SERV-INST-001'),
('Maintenance Service', 'Service', 1500.00, 800.00, 'Services', 'SERV-MAINT-001')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
