# ARCHITECTURE — Urban Furniture Accounting System

Companion documents: `PROJECT_PLAN.md` (scope & roadmap), `DATABASE_DESIGN.md` (schema & accounting mappings), `TODO.md` (execution checklist), `CLAUDE.md` (rules for future AI sessions).

---

## 1. Recommended Tech Stack

| Layer | Choice | Reasoning |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript (strict)** | One codebase, one language, one deploy. Eliminates the CORS/contract/two-server integration tax that kills 24-hour builds. Server Components let report pages query the database directly with no HTTP hop or client fetch state. |
| Database | **PostgreSQL 16** (Neon serverless, or Docker locally) | `NUMERIC` fixed-point arithmetic is mandatory for money. Real transactions, `SELECT … FOR UPDATE`, `DEFERRABLE` constraint triggers, partial unique indexes, and CTEs — all four are used by the accounting engine. SQLite and MySQL cannot deliver this combination. |
| ORM | **Prisma 6** | Migrations, `Decimal` mapped to `NUMERIC(18,2)`, interactive `$transaction`, and end-to-end generated types. `$queryRaw` is available for the handful of aggregate report queries where raw SQL is clearer. |
| UI | **Tailwind CSS + shadcn/ui** | Copy-in components (not a dependency) means unlimited restyling with zero fighting. Delivers judge-visible polish in minutes, which matters when ~50 screens are in scope. |
| Charts | **Recharts** | The mockup requires a pie chart on the Budget Report. Recharts composes cleanly with React and needs no imperative setup. |
| Tables | **TanStack Table (headless)** | Powers the single generic `DataTable` behind every list view. Headless means it inherits the shadcn styling instead of imposing its own. |
| Forms | **react-hook-form + Zod** | One Zod schema per entity, shared by the client form and the server action. Validation logic exists exactly once. |
| Auth | **Custom session: `jose` JWT in an httpOnly cookie + `bcryptjs`** | Requirements are login-ID based (not email), with three roles and row-level portal scoping. A ~120-line hand-rolled session is less work and far less magic than bending a full auth library to a custom identifier. No version churn under time pressure. |
| Money | **`decimal.js` client-side, Prisma `Decimal` server-side** | See §11. Floating-point money is a disqualifying defect in an accounting system. |
| Tests | **Vitest** | Fast, zero-config with TS. Used exclusively for accounting invariants and report maths — the only places where a 24-hour project earns its testing time back. |
| Deploy | **Vercel + Neon** | Push-to-deploy, free tier, no infrastructure work. Use Neon's **pooled** connection string (see §12, R6). |

### 1.1 Why not a separate backend

`Hackathon_AI_Usage_Strategy.md` sketches `frontend/` and `backend/` directories. That split is deliberately **not** used, because in a 24-hour window it costs 2–4 hours in pure integration overhead — duplicated types, CORS, auth token plumbing, two dev servers, two deploys, two failure modes — and buys nothing a judge can see.

The separation of concerns is preserved *structurally* instead, with a hard boundary:

> **`src/server/**` is the backend.** It is the only place permitted to import Prisma or reference `process.env` secrets. `src/app/**` and `src/components/**` must never import `@prisma/client` — they call service functions.

This is enforced by convention plus an ESLint `no-restricted-imports` rule. The architecture is identical to a two-tier system; only the network boundary is removed.

### 1.2 Plan B

If the team is materially stronger in Python than TypeScript, the equivalent stack is **FastAPI + SQLModel/Alembic + PostgreSQL + Vite/React + shadcn**. Every design decision in this document — the posting service, the invariants, the schema, the mappings — transfers unchanged; only the syntax differs. **Decide this at Hour 0 and never revisit it.** A stack change after Hour 2 forfeits the hackathon.

---

## 2. High-Level System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  BROWSER                                                             │
│  ┌────────────────┐  ┌────────────────┐  ┌─────────────────────────┐ │
│  │ Admin /        │  │ Accountant     │  │ Contact Portal          │ │
│  │ Business Owner │  │ (Invoicing)    │  │ (own invoices only)     │ │
│  └───────┬────────┘  └───────┬────────┘  └───────────┬─────────────┘ │
└──────────┼───────────────────┼───────────────────────┼───────────────┘
           │  httpOnly session cookie (JWT: userId, role, contactId)
┌──────────▼───────────────────▼───────────────────────▼───────────────┐
│  NEXT.JS EDGE MIDDLEWARE — coarse route gate by role                 │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────────────┐
│  PRESENTATION  ·  src/app/**  ·  src/components/**                   │
│  Server Components (reads) · Client Components (interactivity)       │
│  Generic DataTable · Generic FormShell · Charts                      │
│  MUST NOT import Prisma. Calls services / server actions only.       │
└──────────────────────────────┬───────────────────────────────────────┘
              ┌────────────────┴─────────────────┐
              │                                  │
┌─────────────▼──────────────┐      ┌────────────▼─────────────────────┐
│ SERVER ACTIONS (mutations) │      │ REST /api/v1/** (thin)           │
│ typed, form-native         │      │ portal + judge-facing surface    │
└─────────────┬──────────────┘      └────────────┬─────────────────────┘
              └────────────────┬─────────────────┘
                               │  both delegate — never duplicate logic
┌──────────────────────────────▼───────────────────────────────────────┐
│  SERVICE LAYER  ·  src/server/services/**                            │
│  RBAC guard → Zod validation → business rules → transaction          │
│  contact · product · account · journal · purchaseOrder · vendorBill  │
│  salesOrder · customerInvoice · payment · budget · report · sequence  │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────────────┐
│  ACCOUNTING ENGINE  ·  src/server/accounting/**                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ postEntry()   ← THE ONLY WRITER TO THE LEDGER                │    │
│  │ mappings.ts   ← document type → debit/credit line builder    │    │
│  │ reverseEntry()· integrity.ts · money.ts                      │    │
│  └──────────────────────────────────────────────────────────────┘    │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────────────┐
│  POSTGRESQL — the last line of defence                               │
│  CHECK  single-sided, non-negative lines                             │
│  DEFERRABLE CONSTRAINT TRIGGER  SUM(debit) = SUM(credit) per entry   │
│  TRIGGER  reject UPDATE/DELETE on posted entries (immutability)      │
│  UNIQUE (source_type, source_id, entry_kind)  → idempotency          │
│  NUMERIC(18,2) everywhere money appears                              │
└──────────────────────────────────────────────────────────────────────┘
```

**The governing idea:** every accounting invariant is enforced at three independent levels — the service, the engine, and the database. A bug in the UI, a double-clicked button, a mis-generated service, or a hand-run SQL statement all fail safely. Judges can be invited to *try* to corrupt the ledger.

---

## 3. Folder Structure

```
odoo_hackathon/
├── CLAUDE.md  PROJECT_PLAN.md  ARCHITECTURE.md  DATABASE_DESIGN.md  TODO.md  README.md
├── docs/                              # extracted problem statement + mockup spec (reference)
├── prisma/
│   ├── schema.prisma                  # single source of truth for the schema
│   ├── migrations/                    # includes hand-written trigger/constraint SQL
│   └── seed.ts                        # CoA, journals, taxes, payment terms, sequences, admin
├── src/
│   ├── app/
│   │   ├── (auth)/                    # login · signup · forgot-password · reset-password
│   │   ├── (app)/                     # ADMIN + ACCOUNTANT
│   │   │   ├── dashboard/
│   │   │   ├── masters/{contacts,products,accounts,journals,analytics,budgets}/
│   │   │   ├── purchase/{orders,bills}/
│   │   │   ├── sales/{orders,invoices}/
│   │   │   ├── payments/
│   │   │   ├── accounting/{journal-entries,ledger,integrity}/
│   │   │   ├── reports/{balance-sheet,profit-loss,budget,stock}/
│   │   │   └── settings/{users,password}/
│   │   ├── (portal)/portal/           # CONTACT role only
│   │   └── api/v1/                    # thin REST surface
│   ├── components/
│   │   ├── ui/                        # shadcn primitives
│   │   ├── data-table/                # ONE generic list view
│   │   ├── form/                      # ONE generic form shell + field kit
│   │   ├── documents/                 # shared document header + line editor
│   │   ├── charts/                    # pie, bar, sparkline
│   │   └── layout/                    # top nav, settings menu, breadcrumbs
│   ├── server/                        # ← THE BACKEND. Only place importing Prisma.
│   │   ├── db.ts
│   │   ├── auth/{session.ts,rbac.ts,password.ts}
│   │   ├── accounting/{engine.ts,mappings.ts,reversal.ts,integrity.ts,money.ts}
│   │   ├── services/*.service.ts
│   │   ├── validation/*.schema.ts     # Zod — shared with client forms
│   │   └── reports/{trialBalance.ts,balanceSheet.ts,profitLoss.ts,budget.ts,stock.ts}
│   └── lib/{format.ts,constants.ts,utils.ts}
└── tests/{engine,mappings,reports,rbac}.test.ts
```

---

## 4. Frontend Architecture

### 4.1 The velocity lever: two generic components

Roughly 50 screens are in scope. Hand-building each one does not fit in 24 hours. Two configuration-driven components carry almost all of it:

**`<DataTable>`** — one component, all list views. Takes a column config, a fetcher, and row actions. Provides search, sorting, pagination, row-click navigation, selection checkboxes, empty state, loading skeleton, and a List/Kanban toggle. A new master's list view becomes ~20 lines of column config.

**`<FormShell>`** — one component, all form views. Takes a Zod schema, a field config, and an action bar config. Provides the New/Confirm/Cancel/Back button row, a status stepper (`Draft → Confirmed → …`), inline field errors, dirty-state guards, toasts, and a `warnings[]` renderer for the amber budget notices. A new master's form becomes ~30 lines of field config.

**`<DocumentLines>`** — one editable line grid serving Purchase Orders, Sales Orders, Vendor Bills and Customer Invoices. Columns are configured per document type (bills and invoices add the Chart of Account column; orders omit it). Computes `line_total = qty × unit_price` and the document totals reactively.

**Rule: if a third screen needs the same UI shape, extend the generic component — do not fork it.**

### 4.2 Rendering strategy

- **Server Components by default.** Reports, list views and detail pages render on the server, calling services directly. No loading spinners, no client fetch state, no API contract to keep in sync.
- **Client Components only where interaction demands it** — line editors, the live budget meter, pickers, charts, toasts.
- **Mutations are Server Actions.** Progressive enhancement, typed arguments, and `revalidatePath` for cache invalidation. No manual fetch/serialize/deserialize layer.
- **`Decimal` never crosses the server/client boundary.** Services serialize money to strings at the edge; the client formats for display and parses back with `decimal.js` when editing. This prevents JavaScript `number` from silently touching a monetary value.

### 4.3 Navigation (matches the mockup exactly)

```
Sales    → Sales Order · Sales Invoice · Receipt
Purchase → Purchase Order · Purchase Bill · Payment
Account  → Contact · Product · Analyticals · Analytical Budget ·
           Chart of Account · Journals · Journal Entries
Report   → Balance Sheet · Profit and Loss · Budget Report
Settings → Chart of Accounts · Contact · Sales · Purchase ·
           Password Reset · Log Out
```

Dashboard cards: **Sales** (All / Confirmed / Draft), **Purchase** (All / Confirmed / Draft), **Budget** (Achieved / Budget / Committed) — each with a `New` action, each count clickable through to a pre-filtered list.

---

## 5. Backend Architecture

### 5.1 Layers and their contracts

| Layer | Responsibility | Forbidden |
|---|---|---|
| Route handler / Server action | Parse input, call one service, shape the response | Any business logic, any Prisma call |
| Service | Authorize → validate → apply business rules → open transaction → call the engine | Writing to `journal_entry*` tables directly |
| Engine | Build, validate and persist balanced journal entries | Knowing anything about HTTP, sessions, or UI |
| Repository (Prisma) | Data access | Business decisions |

### 5.2 Canonical service shape

Every mutating service follows the same five steps, in this order:

```ts
export async function confirmVendorBill(input: ConfirmBillInput) {
  const session = await requireRole(['ADMIN', 'ACCOUNTANT']);        // 1. authorize
  const data    = ConfirmBillSchema.parse(input);                    // 2. validate
  const bill    = await loadBillOrThrow(data.id);
  assertState(bill, 'DRAFT');                                        // 3. business rules
  const warnings = await checkBudget(bill);                          //    non-blocking

  return db.$transaction(async (tx) => {                             // 4. ONE transaction
    const number = await allocateSequence(tx, 'VENDOR_BILL', bill.billDate);
    const entry  = await postEntry(tx, buildVendorBillEntry(bill));  // 5. engine posts
    await tx.vendorBill.update({
      where: { id: bill.id },
      data: { state: 'CONFIRMED', number, journalEntryId: entry.id },
    });
    return { ok: true, warnings };                                   // amber, not fatal
  });
}
```

Notes on this shape:
- **Authorization is first, always.** Never after a read, never in the UI only.
- **The transaction wraps sequence allocation and posting together.** If posting fails, the sequence number is not consumed.
- **`warnings` is a distinct channel from errors.** The budget-exceeded notice must never abort the operation.

### 5.3 Generic document service

Purchase Orders, Sales Orders, Vendor Bills and Customer Invoices share ~85% of their logic. A single parameterised factory supplies `create · update · confirm · cancel · addLine · removeLine · recomputeTotals`, configured per document type with: its Prisma model, its partner field (`vendorId` / `customerId`), its sequence code, its default line account, its journal type, and its entry builder. Only the genuinely divergent parts — `createBillFromPO`, `createInvoiceFromSO`, and the two entry builders — are written by hand.

This is where the 8 document tables cost far less than 8× the effort.

---

## 6. Database Architecture

Full schema in `DATABASE_DESIGN.md`. Architectural decisions only, here.

### 6.1 Explicit document tables over one polymorphic table

Odoo unifies everything into `account.move` with a `move_type` discriminator. That was considered and **rejected**:

| | Polymorphic (`documents` + `document_lines`) | Explicit tables (chosen) |
|---|---|---|
| Table count | 2 | 8 |
| Nullable sprawl | High — `vendor_id`/`customer_id`, `bill_date`/`invoice_date` all nullable | None — every column is meaningful |
| FK semantics | Weak; cannot constrain "vendor must be a vendor" | Strong and self-documenting |
| Parallel teamwork | Contended — everyone edits the same model | Clean — one developer per document type |
| Type safety | Union types with narrowing everywhere | Precise generated types per model |
| Schema readability for judges | Requires explanation | Immediately obvious |

The DRY benefit is recovered in the **code** layer (§5.3) rather than the schema layer. This gets the deduplication without the ambiguity.

### 6.2 Purchase/Sales Orders are not accounting documents

`purchase_orders` and `sales_orders` carry **no** `journal_entry_id` and are structurally incapable of posting. Only `vendor_bills`, `customer_invoices` and `payments` reach the ledger. This makes double-counting revenue impossible by construction rather than by discipline.

### 6.3 Money and quantity types

| Concept | Type | Note |
|---|---|---|
| Monetary amount | `NUMERIC(18,2)` | Prisma `Decimal`. Never `float`, never `double`, never JS `number`. |
| Quantity | `NUMERIC(18,3)` | Allows fractional units (metres of fabric). |
| Tax rate | `NUMERIC(7,4)` | Stores 18.0000 as a percentage; permits 4 decimals. |
| Percentage (derived) | computed, never stored | e.g. budget achieved %. |
| Accounting date | `DATE` | **Not** `timestamptz`. Eliminates an entire class of period-boundary timezone bugs. |
| Audit timestamp | `timestamptz` | For `created_at` / `updated_at` only. |

### 6.4 Indexing strategy

The reporting workload is "aggregate posted lines by account over a date range". The indexes that matter:

- `journal_entry_lines (account_id, journal_entry_id)` — the Balance Sheet / P&L / ledger driver
- `journal_entries (state, date)` — every report filters on exactly this pair
- `journal_entries (source_type, source_id)` UNIQUE with `entry_kind` — idempotency and reverse lookup
- `customer_invoices (customer_id, state)` / `vendor_bills (vendor_id, state)` — portal scoping and open-item queries
- `*_lines (analytic_account_id)` — budget achieved computation
- Partial unique index on `users (login_id)` and `users (email)` where not archived

### 6.5 Archive instead of delete

Master data has an `active` boolean. Nothing referenced by a transaction is ever hard-deleted; the CoA screen's `Archived` button flips this flag. Archived records vanish from pickers but remain intact in historical documents and in the ledger. This is required for referential integrity in an accounting system — deleting an account that a posted entry references would corrupt history.

---

## 7. Authentication & Authorization

### 7.1 Authentication

- **Identifier is `login_id`**, not email (per the mockup). Unique, 6–12 characters.
- Passwords hashed with **bcrypt, cost 10**. Cost 12+ is noticeably slow on serverless cold starts; 10 is the right hackathon tradeoff and is stated openly.
- Session is a **`jose`-signed JWT in an httpOnly, Secure, SameSite=Lax cookie**, 8-hour expiry. Claims: `{ userId, role, contactId }`. `contactId` is present only for `CONTACT` users.
- Login failures return exactly `"Invalid Login Id or Password"` — never distinguishing a bad user from a bad password.
- Credential rules live in **one Zod schema** used by the signup form, the admin create-user form, and the server action. See assumption **A5** in `PROJECT_PLAN.md` regarding "password must be unique".
- Forgot password: a single-use, 30-minute, hashed token row. In development the reset link is logged to the console (email delivery is P2).

### 7.2 Authorization — three enforcement layers

**Layer 1 — Edge middleware (coarse).** Route-group gate: `(app)/**` requires `ADMIN|ACCOUNTANT`; `(portal)/**` requires `CONTACT`; `(auth)/**` is public. Cheap, fast, and it stops the obvious cases — but it is treated as a convenience, never as the security boundary.

**Layer 2 — Service guard (the real boundary).** Every service begins with `requireRole([...])`. The UI hiding a button is irrelevant; the server refuses regardless of how the call arrives.

```ts
const CAPABILITIES = {
  ADMIN:      ['master:*', 'txn:*', 'report:*', 'user:*', 'ledger:*', 'demo:*'],
  ACCOUNTANT: ['master:create', 'master:update', 'txn:*', 'report:*', 'ledger:post'],
  CONTACT:    ['portal:read:own', 'portal:pay:own'],
} as const;
```

Derived from the mockup's role notes: **Admin** has all rights including archive and user management; **Accountant** creates master data, records transactions, creates journal entries, manages invoices/bills/payments and views reports, but cannot archive or manage users; **Contact** sees only its own invoices/bills and pays its own dues.

**Layer 3 — Row-level scoping for `CONTACT` (the one that actually matters).** Portal queries never accept a contact identifier from the client. The filter is injected from the session inside the service:

```ts
export async function listMyInvoices() {
  const session = await requireRole(['CONTACT']);
  return db.customerInvoice.findMany({
    where: { customerId: session.contactId, state: 'CONFIRMED' },  // from session, not input
    // …
  });
}
```

The same rule governs `payMyInvoice(invoiceId)`: the service re-loads the invoice and verifies `invoice.customerId === session.contactId` before doing anything. **A dedicated test asserts that Contact A cannot read or pay Contact B's invoice.** This is the single highest-severity security path in the application.

---

## 8. API Design Philosophy

1. **Internal mutations use Server Actions.** Typed end-to-end, no route boilerplate, no client fetch state.
2. **Internal reads use Server Components calling services directly.** No HTTP round trip for a report page.
3. **A thin REST surface exists at `/api/v1/**`** for the portal's interactive calls, the live budget-remaining lookup, and a demonstrable API for judges. Handlers are 5–10 lines and delegate to the same services. There is exactly one implementation of every rule.
4. **Zod schemas are the contract.** One schema per operation, imported by both the client form and the server handler. Types are inferred, never hand-written twice.
5. **Uniform response envelope**, with a first-class channel for non-fatal warnings:

```ts
type Result<T> =
  | { ok: true;  data: T; warnings?: Warning[] }   // warnings = amber, operation succeeded
  | { ok: false; error: { code: string; message: string; fields?: Record<string,string> } };
```

The `warnings` channel is what makes the mockup's non-blocking budget notice expressible without abusing the error path. Failing to separate these two is precisely how teams accidentally hard-block budget overruns.

6. **Errors are typed by code**, not by string matching: `VALIDATION_FAILED`, `FORBIDDEN`, `NOT_FOUND`, `INVALID_STATE`, `UNBALANCED_ENTRY`, `PERIOD_LOCKED`, `ALREADY_POSTED`, `IMMUTABLE_ENTRY`.
7. **Idempotency where it matters.** Confirm and pay operations are naturally idempotent because the ledger's unique constraint rejects a second entry for the same source document.

---

## 9. Accounting Engine Architecture

This is the heart of the project. Everything else is presentation.

### 9.1 Single-writer principle

```
                 ┌─────────────────┐
Vendor Bill ─────▶│                 │
Customer Invoice ▶│   postEntry()   │──▶ journal_entries + journal_entry_lines
Payment ─────────▶│                 │
Manual JE ───────▶│  THE ONLY PATH  │
Reversal ────────▶│                 │
                 └─────────────────┘
```

`postEntry(tx, draft)` is the **only** function in the codebase that inserts into `journal_entries` or `journal_entry_lines`. Nothing else may. This single rule is what makes the invariants tractable — there is exactly one place to validate, one place to audit, and one place to fix.

### 9.2 What `postEntry` does

```ts
type JournalEntryDraft = {
  journalId:  string;
  date:       Date;                 // DATE, not timestamp
  reference:  string | null;
  sourceType: 'VENDOR_BILL' | 'CUSTOMER_INVOICE' | 'PAYMENT' | 'MANUAL' | 'REVERSAL';
  sourceId:   string | null;
  entryKind:  'PRIMARY' | 'REVERSAL';
  state:      'DRAFT' | 'POSTED';
  lines: Array<{
    accountId: string;
    contactId: string | null;       // "Partner" column in the mockup
    label:     string;
    debit:     Decimal;             // exactly one of debit/credit is > 0
    credit:    Decimal;
    analyticAccountId: string | null;
  }>;
};
```

Validation, in order — every failure is a typed error:

1. At least two lines exist.
2. Every line has **exactly one** non-zero side. `debit > 0 && credit > 0` is rejected; `debit == 0 && credit == 0` is rejected.
3. No negative amounts. Negative values are expressed by swapping sides, never by sign.
4. `SUM(debit) == SUM(credit)`, compared with `Decimal.equals` at 2 decimal places. **Never `===` on numbers.**
5. Every `accountId` exists and is `active`.
6. The journal exists and is `active`.
7. The date is not before the period-lock date (P2).
8. `(sourceType, sourceId, entryKind)` is not already taken — enforced by a unique index, so the check is advisory and the constraint is authoritative.

Then it inserts the entry and its lines **inside the caller's transaction** — `postEntry` never opens its own, so document update and ledger write commit or roll back together.

### 9.3 Defence in depth at the database level

The application checks are not trusted alone. Three database guarantees back them up:

```sql
-- 1. Line shape: exactly one side, never negative
ALTER TABLE journal_entry_lines ADD CONSTRAINT jel_single_sided CHECK (
  debit >= 0 AND credit >= 0
  AND NOT (debit > 0 AND credit > 0)
  AND (debit > 0 OR credit > 0)
);

-- 2. Balance, checked at COMMIT so multi-row inserts are legal in between
CREATE CONSTRAINT TRIGGER jel_balanced
  AFTER INSERT OR UPDATE OR DELETE ON journal_entry_lines
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION assert_entry_balanced();
  -- raises when SUM(debit) <> SUM(credit) for the affected entry

-- 3. Immutability of posted entries
CREATE TRIGGER je_immutable
  BEFORE UPDATE OR DELETE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION reject_if_posted();
  -- the only permitted UPDATE on a posted entry is state POSTED -> CANCELLED via reversal
```

`DEFERRABLE INITIALLY DEFERRED` is the essential detail: a row-by-row check would fire after the first line and fail every legitimate two-line entry. Deferring to commit time is what makes the constraint both correct and usable.

### 9.4 Idempotency — duplicate entries made impossible

```sql
CREATE UNIQUE INDEX je_source_unique
  ON journal_entries (source_type, source_id, entry_kind)
  WHERE source_id IS NOT NULL;
```

Double-clicking Confirm, a retried request, a concurrent tab, or a mistakenly re-run script all collide on this index and the second transaction aborts. This satisfies the requirement *"journal entries should not be manually duplicated accidentally"* with a database guarantee rather than an application check — the only version that actually holds under concurrency.

### 9.5 Immutability and corrections by reversal

Posted entries are permanent. Corrections create a new, mirrored entry:

```ts
async function reverseEntry(tx, entryId, reason) {
  const original = await loadPostedEntry(tx, entryId);
  const reversal = await postEntry(tx, {
    ...original,
    date:       today(),                        // reverse in the open period
    reference:  `Reversal of ${original.number} — ${reason}`,
    entryKind:  'REVERSAL',
    lines: original.lines.map(l => ({
      ...l,
      debit:  l.credit,                         // swap the sides
      credit: l.debit,
    })),
  });
  await tx.journalEntry.update({
    where: { id: entryId },
    data:  { state: 'CANCELLED', reversedByEntryId: reversal.id },
  });
  return reversal;
}
```

Both entries remain visible forever and net to zero. The mockup's **"Reset to Draft"** is implemented as *reverse, then unlock the document* — and is **refused** when payments already exist against it (the payment must be reset first). This ordering rule prevents an invoice from being edited out from under a payment that references it.

### 9.6 Draft never touches the ledger

Draft documents have no journal entry at all — not a draft entry, not a zeroed entry, nothing. `journal_entry_id` is `NULL` until confirmation. Every report filters `journal_entries.state = 'POSTED'`. Consequently a draft cannot influence a report even in principle, and requirement 3 ("draft transactions should not affect financial reports") is satisfied structurally rather than by a filter someone might forget.

Manual journal entries are the one exception: they may be *saved* as `DRAFT` (the mockup shows a Draft row in the Journal Entries list) and are still excluded from reports until posted.

### 9.7 Account mappings

Full detail with worked examples in `DATABASE_DESIGN.md §6`. Summary:

| Event | Journal | Debit | Credit |
|---|---|---|---|
| Customer Invoice confirmed | Sales | Debtors (AR) — total | Sales Income — per line; Output Tax Payable — tax |
| Customer Payment received | Bank / Cash | Bank A/c or Cash A/c | Debtors (AR) |
| Vendor Bill confirmed | Purchase | Purchase Expense — per line; Input Tax Receivable — tax | Creditors (AP) |
| Vendor Payment sent | Bank / Cash | Creditors (AP) | Bank A/c or Cash A/c |
| Manual entry | user's choice | user's choice | user's choice |

Two mapping rules that come straight from the mockup:
- The credit account on an invoice line and the debit account on a bill line are read **from the line itself** (`account_id`, defaulted to Sales Income / Purchase Expense but user-overridable). The engine does not hard-code them.
- Payments post to the **Bank or Cash** journal selected by `Payment Via`, not to the document's journal — see assumption **A3**.

### 9.8 Tax architecture (flexible by design)

Tax is modelled but defaults to off, so the UI matches the mockup while the engine genuinely computes tax (assumption **A1**):

- `taxes` table: `name`, `rate NUMERIC(7,4)`, `scope (SALE|PURCHASE|BOTH)`, `computation (PERCENT|FIXED)`, `is_inclusive`, `tax_account_id`.
- Each document line has a nullable `tax_id` and a computed `tax_amount`.
- Document totals: `untaxed_amount`, `tax_amount`, `total_amount`.
- The engine **groups lines by `tax_account_id`** and emits one tax line per account. Adding CGST/SGST splits later means adding rows to `taxes`, with no engine change.
- Inclusive tax is handled by back-solving the net: `net = gross / (1 + rate/100)`, rounded once at the line level.

Rounding policy: **round once, at the line level**, half-up to 2 decimals; document totals are the sum of already-rounded lines. This guarantees `SUM(lines) == header total` exactly, which is what keeps the entry balanced. Rounding at the header instead is the classic source of one-paisa imbalances.

### 9.9 Transaction lifecycles

```
PURCHASE ORDER / SALES ORDER   (no ledger impact, ever)
  DRAFT ──confirm──▶ CONFIRMED ──create bill/invoice──▶ (source link set)
    └──cancel──▶ CANCELLED

VENDOR BILL / CUSTOMER INVOICE
  DRAFT ──confirm──▶ CONFIRMED  ⟹ postEntry() PRIMARY
                        │  payment status derived: NOT_PAID → PARTIAL → PAID
                        ├──reset to draft──▶ DRAFT   (reverses entry; refused if payments exist)
                        └──cancel──────────▶ CANCELLED (reverses entry)

PAYMENT
  DRAFT ──confirm/pay──▶ POSTED  ⟹ postEntry() + allocation rows written
                           └──reset to draft──▶ DRAFT (reverses entry, drops allocations)

JOURNAL ENTRY
  DRAFT ──post──▶ POSTED (immutable) ──reverse──▶ CANCELLED + new REVERSAL entry

BUDGET
  DRAFT ──confirm──▶ CONFIRMED ──revise──▶ REVISED  (clones into a NEW budget,
    └──cancel──▶ CANCELLED                            bidirectionally linked)
```

### 9.10 Payment allocation and derived status

A payment does not point at a single document. `payment_allocations (payment_id, document_type, document_id, amount)` joins them many-to-many. This costs one small table and delivers:

- Partial payments (mandatory — the mockup's `Partial` badge requires them)
- One payment settling several invoices
- Several payments settling one invoice
- Credit notes later, with no schema change

`amount_paid` is maintained on the document as `SUM(allocations)` (recomputed on every allocation change, never incremented in place — increments drift). Status is **derived, never stored**:

```
amount_due = total_amount − amount_paid
amount_due == 0            → PAID
0 < amount_due < total     → PARTIAL
amount_due == total        → NOT_PAID
```

Exactly as the mockup's badge legend specifies. And because `amount_paid` is a convenience cache, the Ledger Integrity panel independently reconciles it against the AR/AP control accounts — so a drift bug surfaces immediately instead of silently.

---

## 10. Reporting Architecture

### 10.1 One primitive, all reports

```
                    ┌──────────────────────────────┐
                    │  trialBalance(from, to)      │
                    │  ─────────────────────────    │
                    │  SELECT account_id,          │
                    │    SUM(debit), SUM(credit)   │
                    │  FROM journal_entry_lines l  │
                    │  JOIN journal_entries e …    │
                    │  WHERE e.state = 'POSTED'    │
                    │    AND e.date BETWEEN …      │
                    │  GROUP BY account_id         │
                    └───────────┬──────────────────┘
                    ┌───────────┼───────────┬─────────────┐
                    ▼           ▼           ▼             ▼
              Balance Sheet   P&L    Account Ledger   Integrity
              (as of date)  (range)   (drill-down)      Panel
```

Deriving both statements from one primitive is not just DRY — it makes it **arithmetically impossible** for the P&L's net income to disagree with the Balance Sheet's current-period profit line, because both read the same aggregation. Two independently written queries would drift, and that drift is a demo-killer.

### 10.2 Signed balances

`raw_balance = SUM(debit) − SUM(credit)`.

For presentation, multiply by the account class's normal-balance sign so credit-normal accounts read positive:

| Account class | Normal balance | Sign |
|---|---|---|
| ASSET | Debit | `+1` |
| EXPENSE | Debit | `+1` |
| LIABILITY | Credit | `−1` |
| EQUITY | Credit | `−1` |
| INCOME | Credit | `−1` |

### 10.3 Balance Sheet — and the balancing rule

Lines map mechanically from `account_type` (see §1.4 of `PROJECT_PLAN.md`):

| Section | Line | Source |
|---|---|---|
| Assets | Bank | `ASSET_BANK` |
| Assets | Cash | `ASSET_CASH` |
| Assets | Debtors | `ASSET_RECEIVABLE` |
| Assets | Other Assets | `ASSET_OTHER` |
| Liabilities | Creditors | `LIABILITY_PAYABLE` |
| Liabilities | Other Liability | `LIABILITY_OTHER` |
| Equity | Capital | `EQUITY` |
| Equity | **Current Period Profit** | **computed:** `INCOME − (EXPENSE + OTHER_EXPENSE)` |

```
Total Assets  ==  Total Liabilities + Total Equity + Current Period Profit
```

**The Current Period Profit line is mandatory.** Without it the statement cannot balance, and the mockup's promise — *"The Total of All asset and liability would always match"* — is broken. There is no year-end closing entry in this system (assumption **A7**), so retained earnings is always this derived line. A test asserts a zero delta before any report UI is written.

### 10.4 Profit & Loss

| Line | Computation |
|---|---|
| Income | total of `INCOME` |
| — Income from Sales | total of `INCOME` accounts (Sales Income A/c) |
| Expenses | total of `EXPENSE` + `OTHER_EXPENSE` |
| — Purchase Expense | total of `EXPENSE` |
| — Other Expense | total of `OTHER_EXPENSE` |
| **Net Income** | Income − Expenses |

Matches the mockup's field-computation notes exactly.

### 10.5 Budget Report

Committed comes from `budget_lines`. **Achieved is computed, never stored**, exactly as the mockup specifies:

```sql
-- INCOME lines: sum matching customer invoice lines, posted, within the budget period
-- EXPENSE lines: sum matching vendor bill lines,     posted, within the budget period
SELECT COALESCE(SUM(l.line_total), 0)
FROM customer_invoice_lines l
JOIN customer_invoices i ON i.id = l.invoice_id
WHERE l.analytic_account_id = $analyticId
  AND i.state = 'CONFIRMED'
  AND i.invoice_date BETWEEN $budgetStart AND $budgetEnd;
```

Then `achieved_pct = achieved / committed × 100` and `amount_to_achieve = committed − achieved`. Clicking an achieved figure opens the contributing documents — the mockup requires this, and it is a natural instance of the D2 drill-down.

### 10.6 Remaining-budget lookup (drives the D3 warning)

```
remaining(analytic, date) = committed_on_confirmed_budget_covering(date)
                          − achieved_so_far_in_that_period
```

Called on PO/Bill confirm to emit `warnings[]`, and debounced from the line editor to feed the live meter. Returns `null` when no confirmed budget covers the date — in which case there is nothing to warn about.

### 10.7 Print / PDF

Primary approach: a **print stylesheet** (`@media print`) plus `window.print()`. Roughly 15 minutes of work, renders exactly what is on screen, and the browser's own "Save as PDF" satisfies the mockup's "Pdf download on click". Upgrade to `@react-pdf/renderer` only if a genuine server-side file is needed. Puppeteer is explicitly rejected — cold-start latency on serverless plus a large dependency, for no visible gain.

### 10.8 Performance

Report tables use `NUMERIC` aggregation over a few thousand rows at demo scale — no caching, no materialised views, no pre-aggregation. Correctness and transparency are worth far more here than milliseconds, and any stored aggregate would undermine the "reports are derived, not maintained" guarantee. If a report ever became slow, the fix is a materialised view refreshed on post — deliberately not built.

---

## 11. Money Handling — Non-Negotiable Rules

The most likely way an otherwise-correct accounting system loses credibility is `0.1 + 0.2 !== 0.3`.

1. **Database:** every monetary column is `NUMERIC(18,2)`. No `float`, no `double precision`, no `money`.
2. **Server:** Prisma `Decimal` (decimal.js) end to end. `Decimal.add/sub/mul/div`, never `+ - * /`.
3. **Comparison:** `a.equals(b)` or `a.comparedTo(b) === 0`. Never `===`, never `Math.abs(a-b) < ε` for money.
4. **Boundary:** services serialize `Decimal` → `string` before returning to the client. `Decimal` is not JSON-safe, and converting to `number` at the boundary is exactly how precision is silently lost.
5. **Client:** money arrives as a string, is formatted for display, and is parsed with `decimal.js` when edited. A monetary value never becomes a JS `number`.
6. **Rounding:** half-up to 2 decimals, applied **once per line**. Header totals are sums of rounded lines, never a rounded sum of raw values.
7. **A single `money.ts` module** owns construction, arithmetic helpers, rounding and formatting. Nothing else performs monetary arithmetic.

---

## 12. Key Technical Decisions & Tradeoffs

| # | Decision | Alternative rejected | Tradeoff accepted |
|---|---|---|---|
| 1 | Next.js monolith | Separate API + SPA | Less deployment flexibility; **saves 2–4h of integration** and removes an entire class of failure |
| 2 | PostgreSQL | SQLite / MySQL | Slight setup cost; gains `NUMERIC`, deferrable constraint triggers, `FOR UPDATE` — all three are load-bearing |
| 3 | Prisma | Drizzle / raw SQL | Some magic and a heavier client; gains migrations, `Decimal`, and generated types under time pressure |
| 4 | Explicit document tables | One polymorphic `documents` table | 8 tables instead of 2; gains clarity, strong FKs, and conflict-free parallel work (§6.1) |
| 5 | Payment allocation table | `invoice_id` FK on payment | One extra table; **required** for partial payments and the `Partial` badge |
| 6 | Custom `jose` session | Auth.js / NextAuth | Hand-rolled crypto surface (small and reviewed); avoids bending a library to login-ID auth mid-hackathon |
| 7 | Server Actions for mutations | Full REST for everything | Less framework-portable; removes an entire hand-written API layer |
| 8 | Reports derived from the ledger | Stored running balances | Slower at scale; **the correctness guarantee is the whole point** |
| 9 | Reversal-based corrections | Edit or delete posted entries | Extra step for the user; delivers a genuine audit trail and true immutability |
| 10 | Tax modelled but defaulted off | Ignore tax / force tax on every line | Slightly more schema; satisfies the PDF *and* the mockup simultaneously (**A1**) |
| 11 | Derived stock report | Full inventory subsystem | No valuation or COGS; satisfies the PDF's "stock reports" for ~30 minutes of work (**A2**) |
| 12 | Current Period Profit as a computed equity line | Year-end closing entries | No period close; **the Balance Sheet balances**, at a fraction of the effort (**A7**) |
| 13 | `DATE` for accounting dates | `timestamptz` | No time-of-day on entries; eliminates timezone period-boundary bugs |
| 14 | Two generic UI components | Bespoke screens | Some configuration indirection; **the only way ~50 screens fit in 24 hours** |
| 15 | Print CSS for PDF | Puppeteer / server rendering | Browser-mediated download; 15 minutes instead of 2 hours, no cold-start risk |
| 16 | Vitest only on the engine and reports | Full test pyramid, or no tests | Untested UI; concentrates the entire testing budget on the code where a bug is fatal |
| 17 | Neon **pooled** connection string | Direct connection | Slight PgBouncer constraints; prevents serverless connection exhaustion (**R6**) |
| 18 | No LLM features | AI insights / OCR / chat | Forgoes an "AI" talking point; avoids latency, key management, hallucination and last-hours risk. P2-1 delivers the insight value in SQL |

---

## 13. Technical Risks

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| R1 | Balance Sheet does not balance (Current Period Profit omitted from equity) | **Fatal to the demo** | Build the trial balance first; assert a zero delta in a test *before* any report UI (§10.3) |
| R2 | Floating-point money drift | Loss of credibility | `NUMERIC(18,2)` + `Decimal` everywhere + one `money.ts`; round once per line (§11) |
| R3 | Duplicate journal entries from a double-clicked Confirm | Corrupt ledger, wrong reports | `UNIQUE (source_type, source_id, entry_kind)`; disable the button while pending (§9.4) |
| R4 | Sequence gaps or duplicate document numbers under concurrency | Visible embarrassment | Allocate inside the transaction with `SELECT … FOR UPDATE` on the sequence row |
| R5 | Scope overrun — ~50 screens do not fit | Unfinished demo | `DataTable` + `FormShell` + generic document service; the cut order in `PROJECT_PLAN.md §6` |
| R6 | Prisma exhausts Postgres connections on serverless | Production-only failure at judging time | Neon pooled URL; a single global `PrismaClient` |
| R7 | Timezone bugs shifting entries across period boundaries | Wrong reports, hard to spot | `DATE` columns; construct dates in UTC; never `new Date()` for an accounting date |
| R8 | Contact portal leaks another contact's invoices | Security failure a judge may probe | Session-injected scoping in the service layer (never from input) + a dedicated cross-tenant test (§7.2) |
| R9 | Schema churn after Hour 4 | Cascading rework, merge hell | **Freeze the schema at Hour 4.** Additive-only migrations after that |
| R10 | Merge conflicts across the team | Lost hours near the deadline | File-level ownership by module; the generic components land before feature work begins |
| R11 | Budget warning wrongly implemented as blocking | Contradicts an explicit requirement | Separate `warnings[]` from `error` in the response envelope (§8) |
| R12 | Reports include draft documents | Wrong numbers | Every report query filters `state = 'POSTED'`; drafts have no entry at all (§9.6) |
| R13 | Rounding at the header causes one-paisa imbalance | Constraint trigger rejects the entry | Round once per line; headers are sums of rounded lines (§9.8) |
| R14 | Deployment fails or the database is empty at judging | No demo | Deploy by Hour 16 and re-verify hourly; seed script; **backup video recorded by Hour 23** |
| R15 | Payment reset leaves a stale `amount_paid` | Wrong status badge | Recompute `amount_paid` from allocations, never increment; the Integrity panel reconciles it against AR/AP |
| R16 | The `DEFERRABLE` trigger is written non-deferrable | Every legitimate multi-line entry is rejected | Explicitly `DEFERRABLE INITIALLY DEFERRED`; a two-line insert test covers it (§9.3) |

---

## 14. Testing Strategy

Testing is deliberately narrow and deep: ~1 hour spent entirely where a defect is unrecoverable.

**Engine invariants** (`tests/engine.test.ts`)
- A balanced two-line entry posts.
- An unbalanced entry is rejected with `UNBALANCED_ENTRY`.
- A line with both debit and credit is rejected.
- A negative amount is rejected.
- Posting the same source document twice is rejected (idempotency).
- Updating a posted entry is rejected (immutability).
- A reversal produces mirrored lines and nets to zero.

**Mappings** (`tests/mappings.test.ts`)
- Customer invoice → Dr Debtors / Cr Sales Income, balanced.
- Vendor bill → Dr Purchase Expense / Cr Creditors, balanced.
- Customer payment → Dr Bank|Cash / Cr Debtors.
- Vendor payment → Dr Creditors / Cr Bank|Cash.
- A taxed invoice splits the tax to the correct account and still balances.

**Reports** (`tests/reports.test.ts`)
- On the seeded dataset: **Assets − (Liabilities + Equity + Current Period Profit) == 0**.
- P&L net income == the Balance Sheet's current-period profit line.
- Draft documents contribute nothing to any report.
- Budget achieved matches a hand-computed figure.

**RBAC** (`tests/rbac.test.ts`)
- Contact A cannot read Contact B's invoice.
- Contact A cannot pay Contact B's invoice.
- An Accountant cannot archive master data or create users.

**Manual smoke path**, run three times before judging: seed → purchase cycle → sales cycle → partial then full payment → all three reports → Integrity panel green → portal login and pay.
