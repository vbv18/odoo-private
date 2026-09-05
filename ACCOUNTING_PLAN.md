# Urban Furniture Accounting System - Implementation Plan

## Overview
Complete ERP/Accounting system for Urban Furniture with Master Data, Transactions, and Reporting capabilities.

## Role-Based Access Control

### 1. Admin (Business Owner)
- **Permissions**: Full access to everything
- **Can do**:
  - Create/Modify/Archive Master Data
  - Record all Transactions
  - View all Reports
  - Manage Users
  - Configure System Settings

### 2. Invoicing User (Accountant)
- **Permissions**: Create master data, record transactions, view reports
- **Can do**:
  - Create Master Data (cannot archive system accounts)
  - Record all Transactions
  - View all Reports
  - Cannot manage users or system settings

### 3. Contact User
- **Permissions**: View only their own transactions
- **Can do**:
  - View their own Invoices/Bills
  - Make Payments
  - View their transaction history
  - Cannot access other data

## Pages to Build

### DASHBOARD (Already exists - needs improvement)
- [x] Dashboard page exists
- [ ] Improve box sizing and text readability
- [ ] Add real data from backend
- [ ] Role-based dashboard (different view for Admin/Accountant/Contact)

### MASTER DATA MODULES

#### 1. Contacts Module
- [ ] `/contacts` - List all contacts (table with filters)
- [ ] `/contacts/new` - Create new contact form
- [ ] `/contacts/[id]` - View/Edit contact details
- [ ] `/contacts/[id]/transactions` - View all transactions for contact
- Features:
  - Create Customer/Vendor/Both
  - Add profile image
  - Link to user account (for Contact role)
  - Archive/Unarchive

#### 2. Products Module
- [ ] `/products` - List all products (table with filters)
- [ ] `/products/new` - Create new product form
- [ ] `/products/[id]` - View/Edit product details
- Features:
  - Product types: Goods, Service, Combo
  - Track stock for Goods
  - Set sales price & cost price
  - Category management
  - Archive/Unarchive

#### 3. Chart of Accounts Module
- [ ] `/chart-of-accounts` - Tree view of all accounts
- [ ] `/chart-of-accounts/new` - Create new account
- [ ] `/chart-of-accounts/[id]` - View/Edit account details
- [ ] `/chart-of-accounts/[id]/ledger` - View account ledger
- Features:
  - Account types: Asset, Liability, Expense, Income, Capital
  - Parent-child hierarchy
  - Opening & current balance
  - System accounts (cannot delete)

#### 4. Journals Module
- [ ] `/journals` - List all journals
- [ ] `/journals/new` - Create new journal
- [ ] `/journals/[id]` - View/Edit journal details
- [ ] `/journals/[id]/entries` - View all entries in journal
- Features:
  - Journal types: Sales, Purchase, Bank, Cash, General
  - Default debit/credit accounts
  - Archive/Unarchive

#### 5. Analytic Accounts & Budget Module
- [ ] `/analytic-accounts` - List analytic accounts
- [ ] `/analytic-accounts/new` - Create analytic account
- [ ] `/budgets` - List all budgets
- [ ] `/budgets/new` - Create new budget
- [ ] `/budgets/[id]` - View/Edit budget details
- Features:
  - Analytic types: Income, Expenses
  - Budget periods
  - Planned vs Achieved tracking
  - Responsible person assignment

### TRANSACTION WORKFLOWS

#### 6. Purchase Flow
- [ ] `/purchases/orders` - List all POs
- [ ] `/purchases/orders/new` - Create new PO
- [ ] `/purchases/orders/[id]` - View/Edit PO
- [ ] `/purchases/orders/[id]/receive` - Receive goods
- [ ] `/purchases/orders/[id]/convert-to-bill` - Convert PO to Bill
- [ ] `/purchases/bills` - List all vendor bills
- [ ] `/purchases/bills/new` - Create vendor bill (standalone)
- [ ] `/purchases/bills/[id]` - View/Edit bill
- [ ] `/purchases/bills/[id]/pay` - Register payment
- Features:
  - Select vendor, products, quantities
  - Calculate taxes automatically
  - Track received quantities
  - Generate journal entries on bill posting

#### 7. Sales Flow
- [ ] `/sales/orders` - List all SOs
- [ ] `/sales/orders/new` - Create new SO
- [ ] `/sales/orders/[id]` - View/Edit SO
- [ ] `/sales/orders/[id]/deliver` - Mark as delivered
- [ ] `/sales/orders/[id]/convert-to-invoice` - Convert SO to Invoice
- [ ] `/sales/invoices` - List all customer invoices
- [ ] `/sales/invoices/new` - Create invoice (standalone)
- [ ] `/sales/invoices/[id]` - View/Edit invoice
- [ ] `/sales/invoices/[id]/receive-payment` - Register payment
- Features:
  - Select customer, products, quantities
  - Calculate taxes automatically
  - Track delivered quantities
  - Generate journal entries on invoice posting

#### 8. Payments Module
- [ ] `/payments` - List all payments (receipts & payments)
- [ ] `/payments/new` - Register new payment
- [ ] `/payments/[id]` - View payment details
- Features:
  - Payment types: Receipt (from customer), Payment (to vendor)
  - Payment methods: Cash, Bank, Cheque, UPI, Card
  - Link to invoice/bill
  - Generate journal entries

#### 9. Journal Entries (Manual Accounting)
- [ ] `/journal-entries` - List all journal entries
- [ ] `/journal-entries/new` - Create manual journal entry
- [ ] `/journal-entries/[id]` - View/Edit journal entry
- Features:
  - Select journal
  - Add debit/credit lines
  - Validate balance (debit = credit)
  - Post entries
  - Reverse entries

### REPORTING

#### 10. Financial Reports
- [ ] `/reports/balance-sheet` - Balance Sheet report
- [ ] `/reports/profit-loss` - Profit & Loss (P&L) report
- [ ] `/reports/budget-report` - Budget vs Actual report
- [ ] `/reports/ledger` - General Ledger report
- [ ] `/reports/trial-balance` - Trial Balance report
- [ ] `/reports/cash-flow` - Cash Flow statement
- Features:
  - Date range filters
  - Comparison periods
  - Export to CSV/PDF
  - Drill-down to transactions

### USER MANAGEMENT (Admin only)
- [ ] `/users` - List all users
- [ ] `/users/new` - Create new user
- [ ] `/users/[id]` - Edit user details
- Features:
  - Assign roles: Admin, Accountant, Contact
  - Link Contact users to Contact master data
  - Activate/Deactivate users

### SETTINGS (Admin only)
- [ ] `/settings/company` - Company information
- [ ] `/settings/tax` - Tax configuration
- [ ] `/settings/numbering` - Document numbering sequences
- [ ] `/settings/preferences` - System preferences

## Backend API Endpoints Needed

### Master Data APIs
- [x] `/api/auth/login` - Exists
- [x] `/api/auth/register` - Exists
- [ ] `/api/contacts` - CRUD for contacts
- [ ] `/api/products` - CRUD for products
- [ ] `/api/chart-of-accounts` - CRUD for CoA
- [ ] `/api/journals` - CRUD for journals
- [ ] `/api/analytic-accounts` - CRUD for analytic accounts
- [ ] `/api/budgets` - CRUD for budgets

### Transaction APIs
- [ ] `/api/purchase-orders` - CRUD for POs
- [ ] `/api/vendor-bills` - CRUD for vendor bills
- [ ] `/api/sales-orders` - CRUD for SOs
- [ ] `/api/customer-invoices` - CRUD for customer invoices
- [ ] `/api/payments` - CRUD for payments
- [ ] `/api/journal-entries` - CRUD for journal entries

### Reporting APIs
- [ ] `/api/reports/balance-sheet` - Generate balance sheet
- [ ] `/api/reports/profit-loss` - Generate P&L
- [ ] `/api/reports/budget-report` - Generate budget report
- [ ] `/api/reports/ledger` - Generate ledger report
- [ ] `/api/reports/trial-balance` - Generate trial balance

### Utility APIs
- [ ] `/api/validate/journal-entry` - Validate journal entry balance
- [ ] `/api/tax/calculate` - Calculate taxes
- [ ] `/api/numbering/next` - Get next document number

## System Business Logic

### Automated Journal Entry Generation

#### When Invoice is Posted:
```
Debit: Accounts Receivable (Customer)
Credit: Sales Revenue
Credit: Tax Payable (if tax applicable)
```

#### When Bill is Posted:
```
Debit: Purchase Expense
Debit: Tax Payable (if tax applicable)
Credit: Accounts Payable (Vendor)
```

#### When Payment Received (from customer):
```
Debit: Cash/Bank
Credit: Accounts Receivable (Customer)
```

#### When Payment Made (to vendor):
```
Debit: Accounts Payable (Vendor)
Credit: Cash/Bank
```

### Data Validation Rules
1. **Login ID**: 6-12 characters (already implemented)
2. **Email**: Must be unique across contacts
3. **Journal Entries**: Total Debit = Total Credit
4. **Payments**: Cannot exceed invoice/bill amount
5. **Stock**: Cannot sell more than available (for Goods)
6. **Budget**: Alert when achieved > 90% of planned

## Implementation Priority

### Phase 1: Foundation (Week 1)
1. ✅ Database schema complete
2. ✅ Authentication system complete
3. [ ] Fix dashboard UI
4. [ ] Role-based access control middleware

### Phase 2: Master Data (Week 2)
5. [ ] Contacts module (full CRUD)
6. [ ] Products module (full CRUD)
7. [ ] Chart of Accounts module (tree view)
8. [ ] Journals module

### Phase 3: Transactions (Week 3-4)
9. [ ] Purchase Orders & Bills workflow
10. [ ] Sales Orders & Invoices workflow
11. [ ] Payments module
12. [ ] Journal Entries (manual accounting)

### Phase 4: Reporting (Week 5)
13. [ ] Balance Sheet
14. [ ] Profit & Loss
15. [ ] Budget Report

### Phase 5: Polish & Testing (Week 6)
16. [ ] User management
17. [ ] Settings module
18. [ ] End-to-end testing
19. [ ] Documentation

## Current Status
- ✅ Authentication system complete (Login, Signup, Create Account)
- ✅ Database schema designed
- ✅ Dashboard UI exists (needs data integration)
- 🔄 Dashboard UI improvement in progress
- ⏳ Master Data modules pending
- ⏳ Transaction workflows pending
- ⏳ Reporting pending

## Next Immediate Steps
1. Fix dashboard UI (improve box sizes, text readability)
2. Create Contacts module (first master data)
3. Build backend APIs for Contacts
4. Implement role-based routing
