# TODO — Urban Furniture Accounting System

**Legend:** `[ ]` Not Started · `[~]` In Progress · `[x]` Completed · `[!]` Blocked · `[-]` Cut (out of scope)
**Tags:** `P0` must-have · `P1` should-have · `P2` nice-to-have

> **Update this file as you work.** It is the shared state between AI sessions and team members.
> After completing a phase, mark it and note anything that deviated from the plan.

**Progress:** Phase 0 planning complete · implementation not started
**Schema freeze deadline:** Hour 4 — additive migrations only after that.

---

## PHASE 0 — Project Setup  ·  Target: H0–H2

- [x] `P0` Read and analyse `Urban Furniture Accounting System.pdf`
- [x] `P0` Extract and analyse `Accounting Hackathon - 24 Hours.excalidraw` (all ~50 screens)
- [x] `P0` Write `PROJECT_PLAN.md`
- [x] `P0` Write `ARCHITECTURE.md`
- [x] `P0` Write `DATABASE_DESIGN.md`
- [x] `P0` Write `TODO.md`
- [x] `P0` Write `CLAUDE.md`
- [ ] `P0` **DECIDE AND LOCK THE STACK** (Next.js monolith vs FastAPI+React). Never revisit after H2.
- [ ] `P0` `npx create-next-app@latest . --ts --tailwind --app --eslint`
- [ ] `P0` Set `tsconfig.json` → `"strict": true`, `noUncheckedIndexedAccess: true`
- [ ] `P0` `npx shadcn@latest init` + add: button, input, select, table, dialog, form, badge, card, tabs, toast, dropdown-menu, popover, calendar, checkbox, separator, skeleton, alert
- [ ] `P0` Install: `prisma @prisma/client zod react-hook-form @hookform/resolvers jose bcryptjs decimal.js @tanstack/react-table recharts date-fns lucide-react`
- [ ] `P0` Install dev: `vitest tsx @types/bcryptjs`
- [ ] `P0` Provision PostgreSQL (Neon free tier) — copy the **pooled** connection string
- [ ] `P0` `.env` + `.env.example`: `DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET`, `NODE_ENV`
- [ ] `P0` `git init`, `.gitignore` (verify `.env` is ignored), initial commit, push to remote
- [ ] `P0` Create the folder skeleton per `ARCHITECTURE.md §3`
- [ ] `P0` ESLint `no-restricted-imports`: forbid `@prisma/client` outside `src/server/**`
- [ ] `P0` `src/server/db.ts` — global singleton `PrismaClient` (avoids dev hot-reload leaks)
- [ ] `P0` `src/server/accounting/money.ts` — `money()`, `add`, `sub`, `mul`, `round2`, `eq`, `fmtINR`
- [ ] `P0` `src/lib/format.ts` — `formatINR`, `formatDate`, `formatQty`
- [ ] `P0` `package.json` scripts: `dev`, `build`, `db:push`, `db:migrate`, `db:seed`, `db:studio`, `db:reset`, `test`
- [ ] `P0` **Assign file-level module ownership across the team** (prevents merge hell)
- [ ] `P1` Deploy an empty app to Vercel now — prove the pipeline works before it matters

**Gate H2:** app boots · database reachable · deploy pipeline green · stack locked.

---

## PHASE 1 — Database + Backend Foundation  ·  Target: H2–H4

### 1.1 Schema (write it all in one sitting — see `DATABASE_DESIGN.md`)
- [ ] `P0` All 12 enums (`DATABASE_DESIGN.md §2`)
- [ ] `P0` `users` + the `role`/`contact_id` consistency CHECK
- [ ] `P0` `contacts`, `product_categories`, `products`
- [ ] `P0` `accounts` (with `type` + derived `class`), `journals`, `taxes`, `payment_terms`
- [ ] `P0` `analytic_accounts`, `sequences`, `password_reset_tokens`
- [ ] `P0` `journal_entries`, `journal_entry_lines`
- [ ] `P0` `purchase_orders` + lines, `vendor_bills` + lines
- [ ] `P0` `sales_orders` + lines, `customer_invoices` + lines
- [ ] `P0` `payments`, `payment_allocations`
- [ ] `P0` `budgets`, `budget_lines`
- [ ] `P2` `audit_logs`
- [ ] `P0` All indexes from `DATABASE_DESIGN.md` (esp. `jel_account_entry_idx`, `je_state_date_idx`)
- [ ] `P0` `npx prisma migrate dev --name init`

### 1.2 Database-level guarantees (hand-written SQL migration — **do not skip**)
- [ ] `P0` `CHECK jel_single_sided` — exactly one side, non-negative, never both/neither
- [ ] `P0` `assert_entry_balanced()` + **`CONSTRAINT TRIGGER … DEFERRABLE INITIALLY DEFERRED`**
- [ ] `P0` `reject_if_posted()` + `je_immutable` trigger
- [ ] `P0` `reject_if_parent_posted()` + `jel_immutable` trigger
- [ ] `P0` `UNIQUE INDEX je_source_unique (source_type, source_id, entry_kind) WHERE source_id IS NOT NULL`
- [ ] `P0` `UNIQUE INDEX journals_one_active_per_type (type) WHERE active`
- [ ] `P0` `vb_source_po_key` / `ci_source_so_key` partial unique indexes
- [ ] `P0` `pa_exactly_one_target` CHECK on `payment_allocations`
- [ ] `P0` **Verify the deferred trigger accepts a legitimate 2-line entry** (the #1 way to break everything)
- [ ] `P0` **Verify the trigger rejects an unbalanced entry at COMMIT**

### 1.3 Seed (`prisma/seed.ts`)
- [ ] `P0` 10 accounts per `DATABASE_DESIGN.md §3.5` (`is_system = true`)
- [ ] `P0` 4 journals (Sales, Purchase, Bank, Cash)
- [ ] `P0` 3 taxes (No Tax default, GST 18%, GST 5%)
- [ ] `P0` 4 payment terms (Immediate, 15, 30, 45 days)
- [ ] `P0` 6 sequences (`P`, `S`, `Bill/`, `INV/`, `PAY/`, `JE/`)
- [ ] `P0` Users: `admin` / `accountant1` / one CONTACT portal user
- [ ] `P0` Sample contacts, product categories, products, analytic accounts
- [ ] `P0` Opening entry: `Dr Bank 500,000 / Cr Capital 500,000` — **via `postEntry()`**, not raw insert
- [ ] `P0` Idempotent seed (upsert by natural key so re-running is safe)

### 1.4 Auth
- [ ] `P0` `src/server/auth/password.ts` — bcrypt hash/verify (cost 10)
- [ ] `P0` `src/server/validation/auth.schema.ts` — login_id 6–12 unique · email unique · password ≥8 with lower+upper+special · common-password denylist (assumption A5)
- [ ] `P0` `src/server/auth/session.ts` — `jose` sign/verify, httpOnly+Secure+SameSite cookie, 8h, claims `{userId, role, contactId}`
- [ ] `P0` `src/server/auth/rbac.ts` — `requireRole()`, `requireSession()`, capability map
- [ ] `P0` `src/middleware.ts` — route-group gate: `(app)` → ADMIN|ACCOUNTANT, `(portal)` → CONTACT
- [ ] `P0` Login page — error is exactly `"Invalid Login Id or Password"`
- [ ] `P0` Sign Up page — creates an **ACCOUNTANT** (assumption A10)
- [ ] `P0` Logout
- [ ] `P1` Forgot Password → token row (hashed, single-use, 30 min); dev-mode link logged to console
- [ ] `P1` Reset Password page
- [ ] `P1` Admin → Create User page (Name, Login ID, Email, Role, Password, Re-enter)
- [ ] `P1` Settings → Password Reset for the logged-in user

### 1.5 Sequences
- [ ] `P0` `sequence.service.ts` — `allocate(tx, code, date)` with `SELECT … FOR UPDATE`, year reset, zero-padding
- [ ] `P0` Verify formats: `P00001` · `S00001` · `Bill/2026/0001` · `INV/2026/0001`

**Gate H4:** 🔒 **SCHEMA FROZEN.** All three roles log in. Seed runs clean. Deferred trigger verified both ways.

---

## PHASE 2 — Master Data  ·  Target: H4–H8

### 2.1 Generic abstractions — BUILD THESE FIRST (the whole 24h plan depends on them)
- [ ] `P0` `components/data-table/DataTable.tsx` — config-driven columns, search, sort, pagination, row-click, checkbox select, empty state, skeleton
- [ ] `P0` `components/data-table/ViewToggle.tsx` — List ↔ Kanban
- [ ] `P0` `components/form/FormShell.tsx` — Zod-driven, action bar (New/Confirm/Cancel/Back), status stepper, inline errors, dirty guard, toasts, **`warnings[]` renderer (amber)**
- [ ] `P0` `components/form/fields/*` — Text, Number, Money, Date, Select, Many2One (searchable + create-on-the-fly), ImageUpload, Textarea
- [ ] `P0` `components/documents/DocumentLines.tsx` — editable line grid, per-doc-type columns, reactive `qty × price` and totals
- [ ] `P0` `components/layout/*` — top nav (Sales/Purchase/Account/Report), settings menu, breadcrumbs, page header

> **Rule:** if a third screen needs the same shape, extend the generic component. Never fork it.

### 2.2 App shell & dashboard
- [ ] `P0` `(app)/layout.tsx` — nav + auth guard
- [ ] `P0` Nav submenus exactly per mockup (`ARCHITECTURE.md §4.3`)
- [ ] `P0` Dashboard cards: Sales (All/Confirmed/Draft) · Purchase (All/Confirmed/Draft) · Budget (Achieved/Budget/Committed)
- [ ] `P0` Each card `New` button + each count links to a pre-filtered list
- [ ] `P1` Settings dropdown: Chart of Accounts, Contact, Sales, Purchase, Password Reset, Log Out

### 2.3 Contacts
- [ ] `P0` `contact.service.ts` — list/get/create/update/archive, `type` filtering helpers
- [ ] `P0` Zod schema (unique email, required type)
- [ ] `P0` List view: Select · Image · Name · Email · Phone
- [ ] `P0` Form: Name, Type (Customer/Vendor/Both — assumption A8), Email, Phone, Street, City, State, Country, Pincode, Image, Payment Terms
- [ ] `P1` Kanban view (avatar + name + email + phone card)
- [ ] `P1` Image upload (local `/public/uploads` or base64 — keep it simple)
- [ ] `P1` "Create portal login" section → provisions a CONTACT user (assumption A9)

### 2.4 Products & Categories
- [ ] `P0` `product.service.ts`, `productCategory.service.ts`
- [ ] `P0` Product list: Select · Product · Category · Type · Sales Price · Cost
- [ ] `P0` Product form: Name, Type (Goods/Service/Combo), Category (Many2One **create-on-the-fly**), Sales Price, Cost, Image
- [ ] `P1` Sales/Purchase account + tax overrides on the product
- [ ] `P1` Kanban view (image + name + prices)

### 2.5 Chart of Accounts
- [ ] `P0` `account.service.ts` — derives `class` from `type` on write
- [ ] `P0` List: Account Name · Type. Buttons New / Confirm / **Archived**
- [ ] `P0` Form: Name, Code, Type — **grouped dropdown**, headings not selectable:
      *Balancesheet:* Asset, Liability, Bank, Capital, Cash · *Profit and Loss:* Income, Expenses, Other Expenses
- [ ] `P0` Block archiving `is_system` accounts and any account with posted lines
- [ ] `P1` Show the current balance per account in the list (links to the ledger — feeds D2)

### 2.6 Journals
- [ ] `P0` `journal.service.ts`
- [ ] `P0` List: Journal Name · Type · Default Account
- [ ] `P0` Form: Name, Code, Type (Sales/Purchase/Bank/Cash), Default Account (Many2One → CoA)
- [ ] `P0` Enforce one active journal per type

### 2.7 Analytic Accounts
- [ ] `P0` `analyticAccount.service.ts`
- [ ] `P0` List + form: Name, Type (Income/Expense)
- [ ] `P1` Form shows every budget using this account: Budget · Start · End · Committed · Achieved
- [ ] `P1` Kanban view

### 2.8 Budgets
- [ ] `P0` `budget.service.ts` — create/update/confirm/cancel + line CRUD
- [ ] `P0` Form: Name, Period (start/end), Responsible (Many2One → contacts)
- [ ] `P0` Lines: Analytic (Many2One) · Type · Committed Amount
- [ ] `P0` Status stepper `Draft → Confirmed → Revised → Cancelled`; buttons New/Confirm/Revise/Cancel
- [ ] `P0` `revise()` — clone to a NEW budget named `"<name> Revised"`, copy lines, old → `REVISED`, link both ways
- [ ] `P1` "Revised With" clickable link on the original; back-link on the revision
- [ ] `P1` Computed columns on lines: Achieved · Achieved % · Amount to Achieve (Confirmed only)
- [ ] `P1` Payment Terms master CRUD (create-on-the-fly from documents)

**Gate H8:** all 6 masters create/read/update/archive. Budget revise produces a linked pair.

---

## PHASE 3 — Purchase Flow  ·  Target: H11–H14 *(after Phase 5 — the engine comes first)*

- [ ] `P0` `document.service.ts` — generic factory: create/update/confirm/cancel/addLine/removeLine/recomputeTotals
- [ ] `P0` `purchaseOrder.service.ts` — configured from the factory
- [ ] `P0` PO list: Number · Vendor · Date · Total · Status. Filters All/Confirmed/Draft
- [ ] `P0` PO form: PO No. (auto `P00001` on confirm), Vendor (Many2One, `VENDOR|BOTH` only), PO Date
- [ ] `P0` PO lines: Sr. No. · Product · Budget Analytics · Qty · Unit Price · Total (`qty × price`) + footer Total
- [ ] `P0` Buttons: New · Confirm · **Create Bill** · Cancel · Back; status stepper
- [ ] `P0` `confirm()` → allocate number, state → CONFIRMED. **No journal entry** (POs never post)
- [ ] `P0` `createBillFromPO()` — copy vendor + all lines, set `source_purchase_order_id`, default line `account_id` = Purchase Expense A/c
- [ ] `P0` Prevent billing the same PO twice (partial unique index + friendly error)
- [ ] `P0` `vendorBill.service.ts`
- [ ] `P0` Bill list: Date · Number · Vendor · Total · Amount Due · Status
- [ ] `P0` Bill form: Bill No. (auto `Bill/2026/0001`), Vendor, Bill Reference (free text), Bill Date, Due Date, Payment Terms
- [ ] `P0` Bill lines: Sr. No. · Product · **Chart of Account** (default Purchase Expense) · Budget Analytics · Qty · Unit Price · Total
- [ ] `P0` Footer: Untaxed · Tax · Total · Paid via Cash · Paid via Bank · **Amount Due**
- [ ] `P0` `confirmBill()` → `postEntry()` in the **Purchase** journal (mapping `DATABASE_DESIGN.md §6.5`)
- [ ] `P0` Payment status badge derived: Paid / Partial / Not Paid
- [ ] `P0` Buttons: New · Confirm · **Pay** · Cancel · Back
- [ ] `P1` **Non-blocking** amber "Exceeds Approved Budget" warning on PO confirm (`warnings[]`, never an error)
- [ ] `P1` Same non-blocking warning on Bill confirm
- [ ] `P1` PO back-link button on the bill — **hidden** when `source_purchase_order_id IS NULL`
- [ ] `P1` Budget button on the bill → opens the Budget Analytic Report
- [ ] `P1` Inline journal-entry preview panel on the confirmed bill (feeds D2)
- [ ] `P1` Print / Send actions

**Gate H14:** a confirmed bill produces exactly one balanced posted entry, visible in Journal Entries.

---

## PHASE 4 — Sales Flow  ·  Target: H11–H14 *(parallel with Phase 3)*

- [ ] `P0` `salesOrder.service.ts` — from the same generic factory
- [ ] `P0` SO list + form: SO No. (auto `S00001`), Customer (Many2One, `CUSTOMER|BOTH` only), SO Date
- [ ] `P0` SO lines identical in shape to PO lines
- [ ] `P0` Buttons: New · Confirm · **Create Invoice** (assumption A4) · Cancel · Back
- [ ] `P0` `confirm()` → number + CONFIRMED. **No journal entry**
- [ ] `P0` `createInvoiceFromSO()` — copy customer + lines, set `source_sales_order_id`, default line `account_id` = Sales Income A/c
- [ ] `P0` Prevent invoicing the same SO twice
- [ ] `P0` `customerInvoice.service.ts`
- [ ] `P0` Invoice list: Date · Number · Customer · Total · Amount Due · Status
- [ ] `P0` Invoice form: Invoice No. (auto `INV/2026/0001`), Customer, Invoice Reference, Invoice Date, Due Date, Payment Terms
- [ ] `P0` Invoice lines with **Chart of Accounts** column (default Sales Income)
- [ ] `P0` Footer: Untaxed · Tax · Total · Paid via Cash · Paid via Bank · Amount Due
- [ ] `P0` `confirmInvoice()` → `postEntry()` in the **Sales** journal (mapping §6.3)
- [ ] `P0` Derived status badge Paid / Partial / Not Paid
- [ ] `P1` SO back-link (hidden when created fresh) · Budget button
- [ ] `P1` Inline journal-entry preview panel
- [ ] `P1` Print / Send

### 4.1 Contact Portal
- [ ] `P0` `(portal)/layout.tsx` — CONTACT-only guard, "Urban Furnitures" branding
- [ ] `P0` `listMyInvoices()` — **filter injected from the session**, never from input
- [ ] `P0` Portal table: Invoice · Invoice Date · Due Date · Amount Due · Status
- [ ] `P0` `Pay Now` button on unpaid rows; `Paid` badge otherwise
- [ ] `P0` `payMyInvoice()` — re-verify `invoice.customerId === session.contactId` before acting
- [ ] `P0` Success screen → invoice flips to `Paid`
- [ ] `P0` **Test: Contact A cannot read or pay Contact B's invoice** (highest-severity path)
- [ ] `P1` Show own vendor bills too (for `BOTH`-type contacts)

**Gate H14:** a confirmed invoice posts one balanced entry; the portal shows only the owner's invoices.

---

## PHASE 5 — Accounting Engine  ·  Target: H8–H11  ⚠️ **CRITICAL PATH — DO THIS BEFORE PHASES 3/4**

- [ ] `P0` `accounting/engine.ts` — `postEntry(tx, draft)` — **the only writer to the ledger**
- [ ] `P0` Validate: ≥2 lines · exactly one side per line · non-negative · `SUM(debit).equals(SUM(credit))` · account active · journal active · source not already posted
- [ ] `P0` **Insert order: entry as DRAFT → insert lines → UPDATE state = POSTED** (required by `jel_immutable`)
- [ ] `P0` Never open its own transaction — always joins the caller's
- [ ] `P0` Typed errors: `UNBALANCED_ENTRY`, `INVALID_LINE`, `ALREADY_POSTED`, `IMMUTABLE_ENTRY`, `PERIOD_LOCKED`
- [ ] `P0` `accounting/mappings.ts` — `buildCustomerInvoiceEntry`, `buildVendorBillEntry`, `buildPaymentEntry`
- [ ] `P0` Read the credit/debit account **from each line's `account_id`**, never hard-coded
- [ ] `P0` Group tax by `tax_account_id`, one line per tax account
- [ ] `P0` **Round once per line**, half-up 2dp; header totals = sum of rounded lines
- [ ] `P0` `accounting/reversal.ts` — `reverseEntry(tx, id, reason)`: mirror sides, original → CANCELLED + `reversed_by_entry_id`
- [ ] `P0` Journal Entries list: Date · Number · Partner · Journal · Total · Status
- [ ] `P0` Manual JE form: Journal (Many2One), Accounting Date, Reference; lines Account · Partner · Debit · Credit
- [ ] `P0` Live running Debit/Credit totals in the form footer
- [ ] `P0` **BLOCKING** error on Post when debit ≠ credit (mockup: "Blocking warning if the debit and credit amount don't match")
- [ ] `P0` Buttons: New · Post · Cancel · Back. Draft entries are editable; posted are read-only
- [ ] `P1` `Reverse` action on a posted entry, with a reason prompt
- [ ] `P1` Attempting to edit a posted entry shows a clear "immutable — use Reverse" message

### 5.1 Engine tests — write these NOW, not later
- [ ] `P0` Balanced 2-line entry posts successfully
- [ ] `P0` Unbalanced entry → `UNBALANCED_ENTRY`
- [ ] `P0` Line with both debit and credit → rejected
- [ ] `P0` Negative amount → rejected
- [ ] `P0` Posting the same source twice → rejected (idempotency)
- [ ] `P0` `UPDATE` on a posted entry → rejected (immutability)
- [ ] `P0` Reversal mirrors lines and nets to zero
- [ ] `P0` Each of the 4 mappings produces a balanced entry with correct accounts
- [ ] `P1` Taxed invoice splits tax to the right account and still balances

**Gate H11 — THIN VERTICAL SLICE.** A manual entry posts, appears in the ledger, moves the trial balance, and refuses to post unbalanced. **Nothing downstream is trustworthy until this is green.**

---

## PHASE 6 — Payments  ·  Target: H14–H16

- [ ] `P0` `payment.service.ts`
- [ ] `P0` Payment form: Payment Type (Send/Receive) · Partner (autofilled) · Amount (defaults to Amount Due) · Date (defaults today) · **Payment Via** (Bank default / Cash) · Note
- [ ] `P0` Resolve `journal_id` from `method` — Bank→Bank journal, Cash→Cash journal (assumption A3)
- [ ] `P0` `Pay` from a bill → prefilled SEND payment
- [ ] `P0` `Pay` from an invoice → prefilled RECEIVE payment
- [ ] `P0` `confirmPayment()` → `postEntry()` (mappings §6.4 / §6.6) + write `payment_allocations`
- [ ] `P0` Service invariants: `Σ allocations ≤ payment.amount` · `Σ allocations ≤ document.total_amount`
- [ ] `P0` **Recompute** `document.amount_paid` from `SUM(allocations)` — never increment in place
- [ ] `P0` Derived status: due=0 → Paid · 0<due<total → Partial · due=total → Not Paid
- [ ] `P0` **Partial payment works end to end** (pay part, then the remainder)
- [ ] `P0` Payment list: Number · Date · Partner · Type · Method · Amount · Status
- [ ] `P0` Success screen after payment
- [ ] `P1` `Reset to Draft` → `reverseEntry()` + drop allocations; **refused if the period is locked**
- [ ] `P1` Refuse `Reset to Draft` on a bill/invoice while payments exist against it
- [ ] `P1` Print / Send on the payment
- [ ] `P1` One payment settling multiple documents (schema already supports it)

**Gate H16:** part-pay then fully pay an invoice; statuses transition correctly; ledger stays balanced.

---

## PHASE 7 — Financial Reports  ·  Target: H16–H19

- [ ] `P0` `reports/trialBalance.ts` — the single primitive (`DATABASE_DESIGN.md §7.1`), `state='POSTED'` only
- [ ] `P0` **TEST FIRST:** on seeded data, `Assets − (Liabilities + Equity + Current Period Profit) == 0`
- [ ] `P0` `reports/balanceSheet.ts` — Assets: Bank · Cash · Debtors · Other Assets; Liab & Equity: Creditors · Other Liability · Capital · **Current Period Profit**
- [ ] `P0` Balance Sheet page: as-of date picker, two columns, Total Asset / Total Liability, Print · Back
- [ ] `P0` `reports/profitLoss.ts` — Income · Income from Sales · Expenses · Purchase Expense · Other Expense · Net Income
- [ ] `P0` P&L page: date range, Balance column, Print · Back
- [ ] `P0` **TEST:** P&L Net Income == Balance Sheet Current Period Profit
- [ ] `P0` **TEST:** draft documents contribute nothing to any report
- [ ] `P0` `reports/budget.ts` — achieved computed per §7.4 (invoices for INCOME, bills for EXPENSE, in period)
- [ ] `P0` Budget Report list: Budget · Start · End · Status · Achieved · Balance
- [ ] `P1` Budget Report Kanban with **pie chart** (achieved vs balance) — Recharts
- [ ] `P1` Click achieved amount → list of contributing invoices/bills
- [ ] `P1` `reports/trialBalance` page (also serves as a debugging tool)
- [ ] `P1` `reports/stock.ts` + page — qty in / qty out / on hand for GOODS (assumption A2)
- [ ] `P1` Print stylesheet (`@media print`) + `window.print()` for BS, P&L, Invoice, Bill
- [ ] `P2` Aged Receivables / Aged Payables

**Gate H19:** 🎯 **Balance Sheet balances to the paisa on seeded data.**

---

## PHASE 8 — UI Polish + Demo Features  ·  Target: H19–H23

### 8.1 D1 — Ledger Integrity Panel `P1` ★ highest value per hour
- [ ] `P1` `accounting/integrity.ts` — the 7 checks from `DATABASE_DESIGN.md §7.8`
- [ ] `P1` Page at `/accounting/integrity` — green/red rows showing **actual numbers**
- [ ] `P1` Check 1: every posted entry balances (N checked, 0 failures)
- [ ] `P1` Check 2: Assets == Liabilities + Equity + Current Period Profit (delta ₹0.00)
- [ ] `P1` Check 3: Debtors control == Σ open invoice balances
- [ ] `P1` Check 4: Creditors control == Σ open bill balances
- [ ] `P1` Checks 5–7: no two-sided lines · no duplicate source entries · no posted entry on a draft doc
- [ ] `P1` "Re-run checks" button + a summary badge in the nav

### 8.2 D2 — Bidirectional Drill-Down `P1` ★
- [ ] `P1` `/accounting/ledger/[accountId]` — posted lines with a running balance
- [ ] `P1` `/accounting/journal-entries/[id]` — entry detail with a link to its source document
- [ ] `P1` Balance Sheet & P&L figures → account ledger
- [ ] `P1` Ledger row → journal entry
- [ ] `P1` Journal entry → source bill / invoice / payment
- [ ] `P1` Reverse direction: bill/invoice/payment → its journal entry
- [ ] `P1` Budget achieved → contributing documents

### 8.3 D3 — Live Budget Meter `P1` ★
- [ ] `P1` `GET /api/v1/budget/remaining?analyticId=&date=` (debounced)
- [ ] `P1` Inline meter on PO/Bill lines: `Furniture · ₹190,000 remaining · this line uses ₹6,000`
- [ ] `P1` Meter turns amber the moment the line would exceed remaining
- [ ] `P1` Amber toast on confirm — **confirmation still succeeds** (non-blocking, per spec)

### 8.4 D4 — Seed Demo Story + Reset `P1` ★ de-risks the whole demo
- [ ] `P1` `/settings/demo` (ADMIN only) — "Generate demo data" + "Reset"
- [ ] `P1` ~3 months of coherent history **through the real service layer** (never raw SQL)
- [ ] `P1` Include: ~20 POs/bills/SOs/invoices, one **partial** payment, one **cash** payment, one **taxed** invoice, one **over-budget** bill, one **revised** budget
- [ ] `P1` Reset restores the clean seed
- [ ] `P1` Confirm the Integrity panel is fully green on generated data

### 8.5 D5 — Reversal & Immutability UI `P1`
- [ ] `P1` `Reverse` button on posted entries (reason prompt)
- [ ] `P1` Attempted edit of a posted entry → clear immutability message
- [ ] `P1` Cancel on a confirmed bill/invoice → reversal entry
- [ ] `P1` Both original and reversal visible in the ledger, netting to zero
- [ ] `P2` Period lock date (block posting before a date)

### 8.6 General polish
- [ ] `P1` Empty states on every list (illustration + "Create your first …")
- [ ] `P1` Loading skeletons on every server-rendered page
- [ ] `P1` Toast on every mutation (success / error / warning)
- [ ] `P1` Consistent INR formatting (`₹1,23,456.00` — Indian grouping)
- [ ] `P1` Status badges: colour-coded and consistent everywhere
- [ ] `P1` Kanban views: Contact · Product · Analytics · Budget Report
- [ ] `P1` Confirm dialogs on Cancel / Archive / Reset to Draft
- [ ] `P1` Disable submit buttons while pending (also guards against double-click duplicates)
- [ ] `P1` Responsive check at 1280px and 1024px (demo laptop widths)
- [ ] `P2` Dashboard Insights strip: top overdue invoice · cash+bank position · biggest expense analytic · budgets >80% consumed (all SQL, no AI)
- [ ] `P2` Global search (⌘K)
- [ ] `P2` CSV export on lists
- [ ] `P2` Dark mode
- [ ] `P2` Bulk actions from list checkboxes

---

## PHASE 9 — Testing + Deployment  ·  Target: H22–H24

### 9.1 Automated
- [ ] `P0` `tests/engine.test.ts` — all invariants (Phase 5.1)
- [ ] `P0` `tests/mappings.test.ts` — 4 mappings balanced with correct accounts
- [ ] `P0` `tests/reports.test.ts` — BS balances · P&L == BS profit · drafts excluded · budget achieved correct
- [ ] `P1` `tests/rbac.test.ts` — cross-contact isolation · accountant cannot archive or create users
- [ ] `P1` `npm test` green in CI or locally before the final commit

### 9.2 Manual smoke path — run **three times** before judging
- [ ] `P0` Seed → login as each of the 3 roles
- [ ] `P0` Purchase: PO → Confirm → Create Bill → Confirm → verify JE → Pay → verify JE → status Paid
- [ ] `P0` Sales: SO → Confirm → Create Invoice → Confirm → verify JE → Pay partial → status Partial → pay rest → Paid
- [ ] `P0` Manual JE: try unbalanced (blocked) → fix → post
- [ ] `P0` Reports: Balance Sheet balances · P&L correct · Budget Report achieved correct
- [ ] `P0` Integrity panel fully green
- [ ] `P0` Portal: login as contact → see only own invoices → Pay Now → Paid
- [ ] `P0` Try to break it: double-click Confirm · edit a posted entry · exceed a budget

### 9.3 Deployment
- [ ] `P0` Deploy to Vercel with the **pooled** Neon `DATABASE_URL`
- [ ] `P0` Run migrations + seed against production
- [ ] `P0` **Verify every flow on the live URL**, not localhost
- [ ] `P0` Confirm demo data is present in production
- [ ] `P1` Deployed by H16 and re-verified hourly afterwards

### 9.4 Submission
- [ ] `P0` `README.md` — what it is, stack, setup, demo credentials, screenshots, **explicit scope tradeoffs**
- [ ] `P0` Demo credentials for all 3 roles listed in the README
- [ ] `P0` **Demo script** — a timed 5-minute walkthrough hitting: master data → purchase → sales → partial payment → reports balancing → Integrity panel → portal
- [ ] `P0` 🎥 **Record a backup demo video by H23** — non-negotiable insurance
- [ ] `P1` Architecture diagram in the README (reuse `ARCHITECTURE.md §2`)
- [ ] `P1` Pitch deck: problem · approach · accounting-correctness proof · differentiators · tradeoffs
- [ ] `P1` Final commit + tag

---

## Cut Order (if time runs short)

Cut strictly left to right. **Never** cut in the other direction.

```
P2 items → Kanban views → stock report → tax UI → print/PDF
         → D5 reversal UI → D3 live meter (keep the confirm warning)
```

**NEVER CUT:** the accounting engine · Balance Sheet & P&L · D1 Integrity panel · D4 demo seed · the portal.

---

## Blockers & Notes

*(Record blockers, deviations from the plan, and decisions made under time pressure here.)*

- **H0:** Planning complete. Stack decision pending — must be locked by H2.
