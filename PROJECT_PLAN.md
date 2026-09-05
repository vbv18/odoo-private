# PROJECT PLAN — Urban Furniture Accounting System

**Event:** Odoo Hackathon 2026 — 24 hours
**Deliverable:** A working, double-entry accounting system with master data, purchase & sales cycles, payments, budgets, and derived financial reports.
**Status of this document:** Phase 0 output (architecture & planning). No production code written yet.

---

## 1. Problem Understanding

### 1.1 What is actually being asked

Urban Furniture needs a small-business ERP-accounting core. The system must let a business owner or accountant:

1. Set up **master data** — contacts, products, chart of accounts, journals, analytic accounts, budgets.
2. Run the two operational cycles end to end:
   - **Purchase:** Purchase Order → Vendor Bill → Payment
   - **Sales:** Sales Order → Customer Invoice → Payment
3. Have the system **automatically produce balanced double-entry journal entries** from those documents.
4. **Derive** financial reports (Balance Sheet, Profit & Loss, Budget Report) from the ledger — not from manually maintained totals.
5. Expose a **customer/vendor portal** where a contact sees only their own invoices and can pay dues.

The judging weight is not on CRUD screens. It is on whether the **accounting is actually correct** — every posted transaction balances, drafts do not pollute reports, payments reduce outstanding balances, and the Balance Sheet genuinely balances.

### 1.2 What the mockup adds beyond the PDF

The Excalidraw mockup is far more prescriptive than the PDF and contains requirements the PDF never states. These are **hard requirements**, not suggestions:

| Requirement | Source | Why it matters |
|---|---|---|
| **Blocking** warning if a manual journal entry's debit ≠ credit | JE form | The core accounting invariant, surfaced in UI |
| **Non-blocking** amber warning "Exceeds Approved Budget" on PO *and* Bill confirm | Warning callouts | Budget is advisory, not a hard stop. Easy to get backwards. |
| Payment status derived: `due == 0 → Paid`, `0 < due < total → Partial`, `due == total → Not Paid` | Status badge legend | **Partial payments must be supported.** |
| Budget lifecycle `Draft → Confirmed → Revised → Cancelled`, where *Revise* creates a **new** budget record and bidirectionally links to the original | Budget stage map | A non-obvious versioning model |
| Chart of Accounts is **pre-configured / seeded**, not built by the user | "All this accounts are to be pre configured" | Seed data is a deliverable |
| CoA account types are grouped in the dropdown under two headings — *Balancesheet* (Asset, Liability, Bank, Capital, Cash) and *Profit and Loss* (Income, Expenses, Other Expenses) — and the grouping heading is **not** selectable | CoA form | Drives a two-level account classification (see §1.4) |
| Achieved amount on a budget line is **computed by scanning posted invoices/bills** for a matching analytic account within the budget period — never stored | Budget field explanation | Reinforces "derive, don't store" |
| Documents carry a per-line **Chart of Account** column, defaulted (Sales for invoices, Purchase for bills) but overridable | Invoice/Bill line tables | The posting engine reads the account from the line |
| List ↔ Kanban view toggle for Contact, Product, Analytics, Budget Report | View toggles | Cheap visual polish, explicitly requested |
| Documents auto-number: `P00001`, `S00001`, `Bill/2026/0001`, `INV/2026/0001` | Field notes | Needs a real sequence allocator |
| Invoice/Bill show a back-link to the source SO/PO — **hidden** when created fresh | PO/SO link button | Small but visible correctness detail |
| Print / Send (email) on payments and reports; PDF download on report Print | Buttons | P1 polish |
| Login-id based auth (not email), with specific credential rules | Auth screens | See §1.5 |

### 1.3 The two cycles, precisely

```
PURCHASE                                   SALES
────────                                   ─────
Purchase Order  (draft → confirmed)        Sales Order    (draft → confirmed)
   │  no ledger impact                        │  no ledger impact
   │  "Create Bill"                           │  "Create Invoice"
   ▼                                          ▼
Vendor Bill     (draft → confirmed)        Customer Invoice (draft → confirmed)
   │  ON CONFIRM → posts Journal Entry        │  ON CONFIRM → posts Journal Entry
   │  Dr Purchase Expense                     │  Dr Debtors (AR)
   │  Cr Creditors (AP)                       │  Cr Sales Income
   ▼                                          ▼
Payment (Send)  (draft → posted)           Payment (Receive) (draft → posted)
   │  Dr Creditors (AP)                       │  Dr Bank / Cash
   │  Cr Bank / Cash                          │  Cr Debtors (AR)
   ▼                                          ▼
Bill status → Partial / Paid               Invoice status → Partial / Paid
```

**Critical rule:** Purchase Orders and Sales Orders are *operational* documents. They produce **no** journal entries. Only Bills, Invoices and Payments touch the ledger. Getting this wrong double-counts revenue.

### 1.4 Account classification — a resolved ambiguity

The mockup shows the CoA **list** with coarse types (`Bank A/c → Assets`, `Cash A/c → Assets`, `Debtors A/c → Assets`) but the CoA **form** dropdown offers finer types (`Asset, Liability, Bank, Capital, Cash` / `Income, Expenses, Other Expenses`), and the Balance Sheet notes read `Bank - Account type Asset - Bank`, `Cash - Account type Asset - cash`, `Debtors - Account type Asset - Debtors`.

**Resolution — two-level classification:**

- `account_type` — fine-grained, user-selectable, drives report line placement:
  `ASSET_BANK, ASSET_CASH, ASSET_RECEIVABLE, ASSET_OTHER, LIABILITY_PAYABLE, LIABILITY_OTHER, EQUITY, INCOME, EXPENSE, OTHER_EXPENSE`
- `account_class` — derived from type, drives normal balance and statement membership:
  `ASSET | LIABILITY | EQUITY | INCOME | EXPENSE`

This single decision makes the Balance Sheet and P&L line layouts in the mockup fall out mechanically instead of being hand-coded. See `DATABASE_DESIGN.md §3.5`.

### 1.5 Assumptions — explicitly stated

Where the spec is silent or self-contradictory, these are the decisions taken. Each is cheap to reverse.

| # | Ambiguity | Assumption taken | Rationale |
|---|---|---|---|
| A1 | PDF mentions **Tax** on Sales Orders and "System computes taxes". The mockup has **no tax field anywhere** and no tax column in line tables. | Build a **full tax subsystem in the schema and engine**, default every line to *no tax* so screens match the mockup exactly, and seed GST 18% / 5% so one taxed invoice can be demoed. | Satisfies both documents. Zero UI divergence from the mockup, but "computes taxes" is demonstrably true. |
| A2 | PDF asks for "financial and **stock** reports". Mockup has no stock screen. | Implement a **read-only stock movement report derived from posted documents** (qty in from bills, qty out from invoices, for `type = GOODS`). No warehouses, no stock moves, no inventory valuation, no COGS posting. | One SQL query. Satisfies the PDF at near-zero risk. Full inventory accounting is out of scope for 24h. |
| A3 | Payment's own journal is unspecified; the mockup's payment screen shows `Journal: Purchase` — but that panel is labelled "Demo Journal Entry" for the **bill**, not the payment. | **Payments post to the Bank or Cash journal**, selected by `Payment Via`. Bills post to Purchase, invoices post to Sales. | Matches the PDF's own example ("Cash received from customer → Dr Cash, Cr Debtor") and standard practice. The mockup panel is showing the bill's entry. |
| A4 | Mockup SO button image reads "Create Bill"; the SO label text reads "Create Invoice". | **"Create Invoice"** on Sales Orders. | The image is a copy-paste artifact from the PO screen. |
| A5 | "Password must be **unique**" (mockup credential rules). | Enforce length ≥ 8 (mockup also says 6–12 for *login id*, not password), plus lower + upper + special character, plus a small common-password denylist. **Do not** compare passwords across users. | Cross-user password comparison requires reversible storage or hash-equality leakage — a security defect. Interpreting "unique" as "not trivially common" is the only safe reading. |
| A6 | Currency unspecified. | **Single currency, INR (₹)**. No multi-currency, no FX revaluation. | Out of scope; adds a whole subsystem. |
| A7 | Fiscal year unspecified (mockup shows "2026" and 01/01–31/01 periods). | Reports take an **explicit date range**, defaulting to the current calendar year. No hard-coded Apr–Mar fiscal year, no year-end closing entry. | Flexible and demo-friendly. Retained earnings handled as "Current Period Profit" — see §1.6. |
| A8 | Contact "Type (Customer/Vendor/Both)" is in the PDF but not visible on the mockup form. | Include a required `Customer / Vendor / Both` selector on the contact form; filter vendor pickers to `VENDOR|BOTH` and customer pickers to `CUSTOMER|BOTH`. | PDF is explicit; it also makes the pickers correct. |
| A9 | "Contact users can be created when creating Contact Master data." | Contact form has an optional **"Create portal login"** section (login id + password). Creating it provisions a `CONTACT`-role user linked to that contact. | Direct reading of the PDF. |
| A10 | Sign Up page role. | Public **Sign Up creates an `ACCOUNTANT`** ("invoicing user") per the mockup note. Admin's Create User page can create any role. `ADMIN` is seeded, never self-registered. | Mockup states it twice. |
| A11 | Product type `Combo`. | Treated as a plain sellable/purchasable line item — same accounting as `Goods`. No bill-of-materials or component explosion. | BoM is a large subsystem with no accounting consequence here. |
| A12 | Analytic account is 1-per-line. | One optional `analytic_account_id` per document line. No multi-account percentage distributions. | Mockup shows a single "Budget Analytics" column. |
| A13 | Journal entry "Partner" column. | Optional `contact_id` on each journal entry line; auto-filled from the source document's partner on generated entries. | Mockup shows it and marks it "Selection from contact master". |

### 1.6 The single biggest correctness trap

The mockup asserts: *"The Total of All asset and liability would always match."*

A naive Balance Sheet listing only `Capital + Creditors` on the liability side **will not balance**, because the profit earned during the period lives in Income and Expense accounts, which appear on the P&L rather than the Balance Sheet.

**Mandatory design rule:** the Balance Sheet's equity section must include a computed line:

```
Current Period Profit = SUM(INCOME credits − debits) − SUM(EXPENSE + OTHER_EXPENSE debits − credits)
```

so that:

```
Total Assets  ==  Total Liabilities + Equity + Current Period Profit
```

There is no year-end closing entry in this system, so retained earnings is always presented as this derived line. This must be verified by an automated test before any report UI is built. See `ARCHITECTURE.md §9`.

---

## 2. Primary Actors & Core User Flows

### 2.1 Roles

| Role | Mockup/PDF name | Capabilities |
|---|---|---|
| `ADMIN` | Admin / Business Owner | Everything. Create/modify/**archive** master data, record transactions, view all reports, manage users, seed/reset demo data, period lock. |
| `ACCOUNTANT` | Invoicing User / Accountant | Create master data, record all transactions, create manual journal entries, manage invoices/bills/payments, view all reports. **Cannot** archive master data or manage users. |
| `CONTACT` | Contact / Portal user | Sees **only their own** invoices and bills with paid/unpaid status. Can pay their own dues. No access to master data, ledger, or reports. |

### 2.2 Flow 1 — Setup (Admin, one-time)

1. Log in as seeded admin.
2. Chart of Accounts and Journals are **already seeded** — review them.
3. Create Contacts: `Azure Furniture` (Vendor), `Nimesh Pathak` (Customer).
4. Create Products: `Office Chair`, `Wooden Table`, `Sofa`, `Dining Table` with category, sales price, cost.
5. Create Analytic Accounts: `Furniture` (Expense), `Project 1` (Income).
6. Create a Budget: `January 2026`, 01/01/2026–31/01/2026, responsible = a contact, line = `Furniture / Expense / ₹200,000 committed`. Confirm it.

### 2.3 Flow 2 — Purchase cycle (Accountant)

1. **New Purchase Order** → vendor `Azure Furniture`, line: `Wooden Chair × 3 @ ₹2,000`, analytic `Furniture`. Total ₹6,000.
2. **Confirm** → if the line exceeds remaining budget, an **amber non-blocking** warning appears; confirmation still succeeds. State → `CONFIRMED`.
3. **Create Bill** → vendor, products, qty, price are copied from the PO. Bill number `Bill/2026/0001` allocated. Bill date, due date (from payment terms) set. Back-link to the PO is shown.
4. **Confirm Bill** → the engine posts a balanced journal entry in the **Purchase** journal:
   `Dr Purchase Expense 6,000 / Cr Creditors 6,000`. The entry becomes visible in Journal Entries with status `Posted`. Bill status → `Not Paid`.
5. **Pay** → payment form pre-filled (partner, amount due, today's date, `Payment Via: Bank`). Confirm.
   Engine posts in the **Bank** journal: `Dr Creditors 6,000 / Cr Bank 6,000`. Bill status → `Paid`, amount due → 0.
6. Partial payment variant: pay ₹4,000 → status `Partial`, amount due ₹2,000.

### 2.4 Flow 3 — Sales cycle (Accountant)

1. **New Sales Order** → customer `Nimesh Pathak`, line `Office Chair × 5 @ ₹2,100`, analytic `Project 1`.
2. **Confirm** → state `CONFIRMED`.
3. **Create Invoice** → `INV/2026/0001`, lines copied, `Sales Income A/c` defaulted on each line.
4. **Confirm Invoice** → engine posts in the **Sales** journal: `Dr Debtors 10,500 / Cr Sales Income 10,500`.
5. **Pay** (Cash or Bank) → engine posts: `Dr Cash 10,500 / Cr Debtors 10,500`. Invoice → `Paid`, success screen shown.

### 2.5 Flow 4 — Portal (Contact)

1. Contact logs in with their portal credentials.
2. Sees only their own invoices: `Invoice | Invoice Date | Due Date | Amount Due | Status`.
3. Paid rows show a `Paid` badge; unpaid rows show a **`Pay Now`** button.
4. `Pay Now` → confirms → invoice status flips to `Paid`, and a real journal entry is posted through the same engine.

### 2.6 Flow 5 — Reporting (Admin / Accountant)

1. Select a reporting period.
2. **Balance Sheet** — Assets (Bank, Cash, Debtors, Other Assets) vs Liabilities & Equity (Capital, Creditors, Other Liability, Current Period Profit). Totals match.
3. **Profit & Loss** — Income → Income from Sales; Expenses → Purchase Expense + Other Expense; Net Income = Income − Expenses.
4. **Budget Report** — list and kanban, per budget: committed, achieved (computed from posted invoices/bills in period), achieved %, amount to achieve, pie chart.
5. **Print** → PDF download.
6. Any figure is **clickable** → drills to the account ledger → to the journal entry → to the source document.

---

## 3. Functional Requirements

### 3.1 Authentication & Users
- FR-A1 Login by **Login ID** + password. Error: `"Invalid Login Id or Password"`.
- FR-A2 Login ID unique, 6–12 characters. Email unique. Password ≥ 8 chars with lowercase + uppercase + special character.
- FR-A3 Public Sign Up creates an `ACCOUNTANT`.
- FR-A4 Admin "Create User" page: Name, Login ID, Email, Role, Password, Re-enter Password.
- FR-A5 Forgot Password flow (token-based reset; dev mode prints the link).
- FR-A6 Password Reset from the settings menu for a logged-in user.
- FR-A7 Sessions are httpOnly cookies; server-side role checks on every mutation.

### 3.2 Master Data (all: list view default, New → blank form, click row → populated form)
- FR-M1 **Contacts** — Name, Type (Customer/Vendor/Both), Email (unique), Phone, Address (Street, City, State, Country, Pincode), Profile Image, optional portal login. List + Kanban.
- FR-M2 **Products** — Name, Type (Goods/Service/Combo), Category (many-to-one, creatable inline), Sales Price, Cost, Image. List + Kanban.
- FR-M3 **Product Categories** — Name; created on the fly from the product form.
- FR-M4 **Chart of Accounts** — Name, Type (grouped dropdown), Code. **Seeded** with: Bank A/c, Cash A/c, Debtors A/c, Creditors A/c, Sales Income A/c, Purchase Expense A/c, Other Expense A/c, Capital A/c. Archivable (Admin only).
- FR-M5 **Journals** — Name, Type (Sales/Purchase/Bank/Cash), Default Account. **Seeded** with the four journals.
- FR-M6 **Analytic Accounts** — Name, Type (Income/Expense). Form shows every budget that uses it, with committed and achieved.
- FR-M7 **Budgets** — Name, Period (start/end), Responsible (contact), lines of `Analytic / Type / Committed`. Lifecycle Draft → Confirmed → Revised → Cancelled. Revise clones into a new budget named `"<name> Revised"` with bidirectional links.
- FR-M8 **Payment Terms** — Name, days (e.g. "30 Days"); creatable inline; drives due-date computation.
- FR-M9 All masters archivable rather than hard-deleted; archived records are excluded from pickers but preserved in history.

### 3.3 Transactions
- FR-T1 **Purchase Order** — auto number `P00001`, vendor, date, lines (product, analytic, qty, unit price, line total). States: Draft → Confirmed → Cancelled. No ledger impact.
- FR-T2 PO Confirm emits a **non-blocking** budget-exceeded warning per offending line.
- FR-T3 **Create Bill** from a confirmed PO copies vendor and all lines; sets `source_purchase_order_id`. Creating a bill twice from one PO is prevented.
- FR-T4 **Vendor Bill** — auto number `Bill/2026/NNNN`, vendor, bill reference (free text), bill date, due date, lines with a **Chart of Account** column defaulted to `Purchase Expense A/c`. Totals: untaxed, tax, total, paid via cash, paid via bank, amount due.
- FR-T5 Bill Confirm posts a balanced entry in the Purchase journal; also emits the non-blocking budget warning.
- FR-T6 **Sales Order** — auto number `S00001`, mirror of FR-T1.
- FR-T7 **Create Invoice** from a confirmed SO — mirror of FR-T3.
- FR-T8 **Customer Invoice** — auto number `INV/2026/NNNN`, mirror of FR-T4 with `Sales Income A/c` defaulted.
- FR-T9 Invoice Confirm posts a balanced entry in the Sales journal.
- FR-T10 **Payment** — type Send/Receive, partner (auto-filled), amount (defaults to amount due), date (defaults to today), Payment Via (Bank default / Cash), note. States Draft → Posted. `Reset to Draft` reverses the entry, and is blocked once the period is locked.
- FR-T11 **Partial payments** supported; a payment allocates against one or more documents.
- FR-T12 Document payment status **derived**: `due == 0 → Paid`, `0 < due < total → Partial`, `due == total → Not Paid`.
- FR-T13 **Manual Journal Entry** — journal, accounting date, reference, lines of `Account / Partner / Debit / Credit`. Draft or Posted. **Post is blocked** when `SUM(debit) ≠ SUM(credit)`, with a blocking error.
- FR-T14 **Journal Entries list** — Date, Number, Partner, Journal, Total, Status.
- FR-T15 Posted entries are **immutable**. Corrections happen via reversal entries, never by edit or delete.
- FR-T16 Confirming the same document twice can never create two journal entries (database-enforced idempotency).
- FR-T17 Print and Send (email) actions on invoices, bills and payments.

### 3.4 Reporting
- FR-R1 **Trial Balance** primitive — per account: total debit, total credit, signed balance, over a date range, `state = POSTED` only.
- FR-R2 **Balance Sheet** — as of a date. Assets: Bank, Cash, Debtors, Other Assets. Liabilities & Equity: Creditors, Other Liability, Capital, Current Period Profit. **Totals must be equal.**
- FR-R3 **Profit & Loss** — date range. Income / Income from Sales / Expenses / Purchase Expense / Other Expense / Net Income.
- FR-R4 **Budget Report** — list + kanban with pie chart. Per line: committed, achieved, achieved %, amount to achieve. Clicking achieved opens the contributing invoices/bills.
- FR-R5 **Account Ledger** — all posted lines for one account with a running balance.
- FR-R6 **Stock Report** (A2) — per goods product: opening 0, qty in (posted bills), qty out (posted invoices), closing.
- FR-R7 Every report row drills down to its source lines.
- FR-R8 Print → PDF.
- FR-R9 Drafts are **never** included in any report.

### 3.5 Dashboard
- FR-D1 Top navigation: **Sales | Purchase | Account | Report** with the exact submenus from the mockup.
- FR-D2 Cards: **Sales** (All / Confirmed / Draft counts), **Purchase** (All / Confirmed / Draft), **Budget** (Achieved / Budget / Committed), each with a `New` action.
- FR-D3 Settings menu: Chart of Accounts, Contact, Sales, Purchase, Password Reset, Log Out.

### 3.6 Non-functional
- NFR-1 All monetary values stored and computed as fixed-point decimals. **Never floating point.**
- NFR-2 Every ledger write happens inside a single database transaction.
- NFR-3 Portal data scoping enforced server-side in the service layer, never in the UI.
- NFR-4 Deployed and publicly reachable with seeded demo data before judging.
- NFR-5 Automated tests covering the accounting invariants.

---

## 4. Scope: MVP vs Differentiators vs Skipped

### 4.1 P0 — MVP. The demo is not viable without these.

| ID | Item | Est. |
|---|---|---|
| P0-1 | Project scaffold, database, ORM, migrations, seed (CoA, journals, taxes, sequences, admin) | 1.5h |
| P0-2 | Auth: login / signup / roles / session / route protection | 1.5h |
| P0-3 | App shell: top nav, settings menu, dashboard cards | 1.0h |
| P0-4 | **Generic DataTable + FormShell abstractions** (reused by all masters) | 1.5h |
| P0-5 | Masters: Contacts, Products + Categories, Chart of Accounts, Journals, Analytic Accounts | 2.5h |
| P0-6 | Budgets: CRUD, lines, Draft/Confirm lifecycle | 1.0h |
| P0-7 | **Accounting engine**: posting service, balance validation, idempotency, immutability, reversal | 2.5h |
| P0-8 | Journal Entries: list, manual form, blocking imbalance guard | 1.0h |
| P0-9 | Purchase flow: PO → Confirm → Create Bill → Confirm (posts JE) | 2.0h |
| P0-10 | Sales flow: SO → Confirm → Create Invoice → Confirm (posts JE) | 1.5h |
| P0-11 | Payments: form, allocations, partial payments, Paid/Partial/Not Paid, cash & bank | 2.0h |
| P0-12 | Reports: Trial Balance → Balance Sheet, P&L | 2.0h |
| P0-13 | Budget Report with achieved computation | 1.0h |
| P0-14 | Sequences (P00001 / Bill/2026/0001 / INV/2026/0001) | 0.5h |
| P0-15 | Contact portal: own invoices, Pay Now | 1.0h |
| P0-16 | Seed demo dataset + deployment | 1.0h |
| | **Total** | **~23h raw** |

Raw P0 already consumes the full window. This is why P0-4 (generic table/form) is non-negotiable — it is what makes P0-5 fit in 2.5 hours instead of 8. Parallelisation across the team is assumed; see §6.

### 4.2 P1 — Should Have. High score-per-hour; build once P0 is green.

| ID | Item | Est. |
|---|---|---|
| P1-1 | **Ledger Integrity panel** (differentiator #1) | 1.5h |
| P1-2 | **Report → ledger → journal entry → source document drill-down** (differentiator #2) | 2.5h |
| P1-3 | **Live remaining-budget meter + non-blocking exceed warning** (differentiator #3) | 2.0h |
| P1-4 | **One-click Seed Demo Story + Reset** (differentiator #4) | 1.5h |
| P1-5 | Reversal-based corrections & Reset to Draft (differentiator #5) | 1.5h |
| P1-6 | Kanban views (Contact, Product, Analytics, Budget Report) + pie chart | 1.5h |
| P1-7 | Print stylesheet → PDF for Balance Sheet, P&L, Invoice, Bill | 1.0h |
| P1-8 | Tax subsystem wired end-to-end (A1) with one taxed invoice in the demo | 1.5h |
| P1-9 | Stock report (A2) | 0.5h |
| P1-10 | Archive/unarchive across masters | 0.5h |
| P1-11 | Payment terms → automatic due-date computation | 0.5h |
| P1-12 | Engine + report invariant tests | 1.0h |

### 4.3 P2 — Nice to Have. Only if genuinely ahead of schedule.

| ID | Item |
|---|---|
| P2-1 | Deterministic **Insights strip** on the dashboard (top overdue invoices, cash position, biggest expense analytic, budgets at risk) — all SQL, no AI |
| P2-2 | Period lock date (block posting before a date) |
| P2-3 | Email sending for Send actions (real SMTP; otherwise a logged preview) |
| P2-4 | Aged Receivables / Aged Payables report |
| P2-5 | Global search (⌘K) across contacts, products, documents |
| P2-6 | Audit log table with an activity timeline |
| P2-7 | CSV export on every list |
| P2-8 | Dark mode |
| P2-9 | Bulk actions from list-view checkboxes |
| P2-10 | Forgot-password email delivery (dev-mode link is sufficient for P0) |

### 4.4 Explicitly SKIPPED — and why

Stating these deliberately is a strength, not a gap. Each is called out in the README and the pitch as a conscious 24-hour tradeoff.

| Skipped | Reason |
|---|---|
| **Multi-currency / FX revaluation** | Entire subsystem; zero demo value for a single-market furniture business. |
| **Full inventory: warehouses, stock moves, valuation layers, COGS posting, landed costs** | The largest possible scope explosion. Replaced with the derived stock report (A2). |
| **Year-end closing entries / retained-earnings rollover** | Replaced with the derived "Current Period Profit" equity line — mathematically equivalent for reporting, a fraction of the work. |
| **Bank statement import & reconciliation** | Needs file parsing plus a matching UI. High effort, invisible in a 5-minute demo. |
| **Credit notes / debit notes / refunds** | The payment-allocation schema is designed to accept them later, but the UI is out of scope. |
| **Recurring invoices, dunning, late fees** | Peripheral to the stated problem. |
| **Multi-company / multi-branch** | No requirement anywhere in the spec. |
| **Approval workflows & delegation** | Budget warnings are explicitly *non-blocking*, so no approval chain is implied. |
| **Real-time collaboration / websockets** | No requirement; adds infrastructure risk. |
| **Mobile-native app** | Responsive web is sufficient. |
| **LLM/AI features** (chat-with-your-books, receipt OCR, anomaly narration) | Deliberately rejected. They need API keys, add latency and failure modes, compete with core correctness for the final hours, and judges discount generic AI bolt-ons. P2-1 delivers the *insight* value deterministically in SQL with none of the risk. |
| **Granular per-field permissions** | Three roles with clear boundaries is enough. |
| **Soft-delete undo history / record versioning** | Archive plus reversal entries covers the real need. |

---

## 5. Differentiating Features — Analysis

Selection criteria applied: must improve real-world usability, accounting intelligence, visualization, automation, or the demo itself. No feature is included merely because it sounds advanced.

### D1 — Live Ledger Integrity Panel ("Prove It")

**What it does.** A single screen that executes the system's accounting invariants live against the real database and displays each with its actual numbers:

1. Every posted journal entry satisfies `SUM(debit) = SUM(credit)` — *N entries checked, 0 failures*
2. `Total Assets = Total Liabilities + Equity + Current Period Profit` — *₹X = ₹X, delta ₹0.00*
3. Debtors control-account balance = Σ open customer invoice balances — *₹X = ₹X*
4. Creditors control-account balance = Σ open vendor bill balances — *₹X = ₹X*
5. No journal entry line is both a debit and a credit
6. No document has more than one posting entry (idempotency intact)
7. No posted entry references a draft document

**Why it impresses judges.** Every team will show invoice screens. Almost none can *prove* their ledger is coherent. This converts "the accounting is correct, trust me" into a verifiable, on-screen demonstration — and it is the fastest way to signal that the engine is real rather than cosmetic. It also doubles as the team's own regression safety net during the build.

**Complexity:** LOW — ~7 SQL aggregate queries plus a table UI. **~1.5h**
**Demo impact:** VERY HIGH — the single strongest 30 seconds of the pitch.
**Build in 24h?** **YES — build it.** Highest value-per-hour item in the plan.

### D2 — Full Bidirectional Drill-Down

**What it does.** Every number is a link, in both directions:
`Balance Sheet: Debtors ₹35,500` → *Debtors account ledger with running balance* → *journal entry `INV/2026/0003`* → *the customer invoice itself*. And in reverse: every invoice, bill and payment shows its generated journal entry inline. Budget achieved amounts open the exact contributing documents (explicitly required by the mockup).

**Why it impresses judges.** Judges click things. Traceability from a financial statement down to a source document is the defining characteristic of a genuine accounting system and the thing CRUD demos cannot fake. It also proves reports are derived from the ledger rather than hard-coded.

**Complexity:** MEDIUM — one generic account-ledger page, one journal-entry detail page, and consistent link wiring. Mostly routing once the report queries return account IDs. **~2.5h**
**Demo impact:** VERY HIGH
**Build in 24h?** **YES — build it.** Design report queries to return IDs from the start so this is wiring, not rework.

### D3 — Budget Guard-Rail with Live Remaining Meter

**What it does.** The mockup requires a non-blocking "Exceeds Approved Budget" warning on PO and Bill confirmation. This elevates it: while entering a line, an inline meter shows `Furniture · ₹190,000 remaining · this line uses ₹6,000` and turns amber the moment the line would exceed the remaining budget — before the user even saves. On confirm, the amber toast appears but confirmation **still succeeds** (advisory, per spec). Paired with the Budget Report pie chart showing achieved vs balance.

**Why it impresses judges.** It is real-world usability and automation combined: the system is actively helping the business owner, not just recording history. It is also visibly *in the spec*, so it scores on completeness and on polish simultaneously. Getting non-blocking right (where many teams will wrongly hard-block) shows careful reading.

**Complexity:** LOW–MEDIUM — one remaining-budget query, a debounced client call, a meter component, and a `warnings[]` channel in the mutation response. **~2h**
**Demo impact:** HIGH
**Build in 24h?** **YES — build it.** The warning itself is P0-adjacent; the live meter is the differentiating layer.

### D4 — One-Click "Seed Demo Story" + Reset

**What it does.** An admin button that builds a coherent three-month history for Urban Furniture — contacts, products, categories, analytic accounts, two budgets (one revised), ~20 purchase orders, bills, sales orders, invoices and payments spread across real dates, including one partial payment, one cash payment, one taxed invoice, and one over-budget bill — **by calling the real service layer**, so every journal entry is genuinely produced by the engine rather than inserted as raw SQL. Plus a one-click reset.

**Why it impresses judges.** Two compounding benefits. First, reports open populated and believable instead of empty — a Balance Sheet with real numbers is dramatically more convincing than a zeroed one. Second, it de-risks the entire demo: any mis-click during judging is recoverable in five seconds. It also functions as a load test that proves the engine holds at volume.

**Complexity:** LOW — it is a script over services that already exist. **~1.5h**
**Demo impact:** VERY HIGH (indirect but decisive)
**Build in 24h?** **YES — build it, early.** Start it the moment invoices post, and grow it alongside each feature; it becomes the team's manual test harness for free.

### D5 — Immutable Ledger with Reversal-Based Corrections

**What it does.** Posted journal entries can never be edited or deleted. Database triggers reject `UPDATE`/`DELETE` on posted entries and their lines. Corrections are made by posting a **reversal entry** (mirrored debits and credits) that leaves both the original and the correction permanently visible. The mockup's "Reset to Draft" is implemented as *reverse-then-unlock*, and is refused when payments already exist against the document.

**Why it impresses judges.** This is what real accounting software does and what auditors require. It is a 20-second demo — attempt to delete a posted entry, get refused; reverse it instead and watch both entries stand in the ledger with the net effect zero — that instantly separates this project from a CRUD app with a `journal_entries` table.

**Complexity:** LOW–MEDIUM — the reversal function is small; the triggers are a few lines of SQL in one migration. **~1.5h**
**Demo impact:** MEDIUM–HIGH
**Build in 24h?** **YES for reversal + triggers** (they are core correctness, not decoration). Period-lock date stays P2.

### Honourable mention — deterministic Insights strip (P2-1)

Four SQL-computed cards on the dashboard: largest overdue receivable, current cash + bank position, biggest expense analytic this period, budgets above 80% consumed. It delivers what an "AI insights" feature would claim to deliver, with zero API dependency, zero latency and zero hallucination risk. Build only if ahead of schedule.

---

## 6. Implementation Roadmap (24 hours)

Assumes a small team working in parallel. `TODO.md` holds the executable checklist; this is the schedule and the gates.

### Hour 0–2 — Foundation (whole team together, then split)
- Scaffold the app, database, ORM, UI library.
- **Write the complete schema in one sitting and freeze it by Hour 4.** Mid-build schema churn is the single most common 24-hour hackathon failure.
- Migrate. Seed Chart of Accounts, Journals, Taxes, Payment Terms, Sequences, admin user.
- Agree file-level ownership to avoid merge conflicts.

### Hour 2–4 — Auth + Shell + Generic Abstractions
- Session, login, signup, roles, route protection, portal scoping helper.
- App shell: top nav, settings menu, dashboard skeleton.
- **`DataTable` and `FormShell`.** Every master and document screen is built on these two components. Do not start screen work before they exist.

**Gate @ H4:** schema frozen · login works for all three roles · one generic list renders real rows.

### Hour 4–8 — Master Data (parallelisable, 2 developers)
- Dev A: Contacts (+ portal login provisioning), Products, Product Categories.
- Dev B: Chart of Accounts, Journals, Analytic Accounts, Budgets (+ lifecycle, revise).
- Both list + form; Kanban deferred to P1.

**Gate @ H8:** all six masters create, read, update, archive.

### Hour 8–11 — Accounting Engine  ← the critical path
- `postEntry()` — the **only** function permitted to write to the ledger.
- Validations: balanced, single-sided lines, non-negative, account active, period open.
- `UNIQUE(source_type, source_id, entry_kind)` for idempotency; immutability triggers; `reverseEntry()`.
- Journal Entries list + manual form with the blocking imbalance guard.
- **Unit tests for the invariants, written now, not later.**

**Gate @ H11 — thin vertical slice:** a manual journal entry can be posted, appears in the ledger, moves the Trial Balance, and refuses to post when unbalanced. Nothing downstream is trustworthy until this gate is green.

### Hour 11–14 — Purchase Flow (Dev A) ‖ Sales Flow (Dev B)
- PO → Confirm → Create Bill → Confirm → posts JE.
- SO → Confirm → Create Invoice → Confirm → posts JE.
- Both built on one shared generic document service and one shared document form.

**Gate @ H14:** a confirmed bill and a confirmed invoice each produce exactly one balanced posted entry, visible in Journal Entries.

### Hour 14–16 — Payments
- Payment form, allocations, partial payments, Paid/Partial/Not Paid, Bank and Cash.
- Reset to Draft via reversal.

**Gate @ H16:** an invoice can be part-paid then fully paid; status transitions correctly; the ledger stays balanced throughout.

### Hour 16–19 — Reports
- `trialBalance(from, to)` primitive, then Balance Sheet and P&L derived from it (guarantees they agree).
- **Assert Assets = Liabilities + Equity + Current Period Profit in a test before building the report UI.**
- Budget Report with achieved computation; stock report.

**Gate @ H19:** Balance Sheet balances to the paisa on the seeded dataset.

### Hour 19–22 — Differentiators
- D1 Ledger Integrity panel · D2 drill-down · D3 live budget meter · D4 seed demo story · D5 reversal UI.
- Kanban views, pie chart, print stylesheets.

### Hour 22–23 — Polish & Demo Prep
- Empty states, loading states, toasts, currency formatting, responsive check.
- README, demo script, run the full happy path three times.
- Deploy and verify against the live URL, not localhost.

### Hour 23–24 — Buffer
- **Record a backup demo video by Hour 23.** Reserve the last hour entirely for the unexpected; do not schedule features into it.

### Priority discipline
If time slips, cut in this order — and never cut in the other direction:
`P2 → Kanban → stock report → tax UI → print/PDF → D5 UI → D3 live meter`.
**Never cut:** the engine, the reports, D1, or D4.

---

## 7. Success Criteria

The project is demo-ready when all of the following hold on the deployed URL:

1. All three roles log in and see correctly scoped interfaces.
2. The full purchase cycle runs end to end and posts correct entries.
3. The full sales cycle runs end to end and posts correct entries.
4. A partial payment produces the `Partial` status and the right amount due.
5. The Balance Sheet balances exactly.
6. The P&L's net income equals the Balance Sheet's current-period profit line.
7. The Budget Report's achieved amounts match the underlying documents.
8. The Ledger Integrity panel is entirely green.
9. A posted entry cannot be edited or deleted; reversal works.
10. Confirming a document twice never creates a duplicate journal entry.
11. A contact sees only their own invoices and can pay one.
12. Any report figure drills down to its source document.
13. Seeded demo data makes every screen look populated and credible.
