# DATABASE DESIGN — Urban Furniture Accounting System

**Engine:** PostgreSQL 16 · **ORM:** Prisma 6 · **Naming:** `snake_case` tables/columns in SQL, `camelCase` in Prisma models via `@map`.

Conventions applied to every table unless stated otherwise:

| Convention | Value |
|---|---|
| Primary key | `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| Audit columns | `created_at timestamptz NOT NULL DEFAULT now()`, `updated_at timestamptz NOT NULL DEFAULT now()` |
| Master-data soft delete | `active boolean NOT NULL DEFAULT true` (archive, never hard-delete) |
| Monetary | `NUMERIC(18,2)` — Prisma `Decimal`. **Never** float/double/money |
| Quantity | `NUMERIC(18,3)` |
| Tax rate | `NUMERIC(7,4)` |
| Accounting date | `DATE` (not `timestamptz`) — see `ARCHITECTURE.md §6.3` |
| Line ordering | `sequence integer NOT NULL DEFAULT 10` |

**Table count: 25.** Assessment in §9.

---

## 1. Entity Relationship Overview

```
                                  ┌──────────┐
                                  │  users   │
                                  └────┬─────┘
                                       │ contact_id (nullable, CONTACT role only)
                                       ▼
  ┌───────────────────┐         ┌────────────┐         ┌─────────────────────┐
  │ product_categories│◀────────│  products  │         │      contacts       │
  └───────────────────┘         └─────┬──────┘         └──────────┬──────────┘
                                      │                            │
       ┌──────────────────────────────┼────────────────────────────┼──────────────┐
       │                              │                            │              │
       ▼                              ▼                            ▼              ▼
┌─────────────────┐          ┌─────────────────┐        ┌──────────────────┐  ┌──────────┐
│ purchase_orders │          │  sales_orders   │        │  vendor_bills    │  │ payments │
│  + _lines       │          │   + _lines      │        │   + _lines       │  │          │
└────────┬────────┘          └────────┬────────┘        └────────┬─────────┘  └────┬─────┘
         │ source_po_id               │ source_so_id             │                 │
         └──────────▶ vendor_bills    └──────────▶ customer_invoices              │
                                                   + _lines                        │
                              ┌────────────────────────┴──────────────┐            │
                              │                                       │            │
                              ▼                                       ▼            ▼
                     ┌─────────────────┐                    ┌─────────────────────────┐
                     │ journal_entries │◀───────────────────│  payment_allocations    │
                     │  + _lines       │  (posted by the    └─────────────────────────┘
                     └────────┬────────┘   accounting engine)
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
       ┌───────────┐   ┌────────────┐  ┌──────────────────┐
       │ journals  │   │  accounts  │  │ analytic_accounts│
       └───────────┘   │   (CoA)    │  └────────┬─────────┘
                       └────────────┘           │
                                                ▼
                                    ┌─────────────────────┐
                                    │ budgets + _lines    │
                                    └─────────────────────┘

  supporting: taxes · payment_terms · sequences · password_reset_tokens · audit_logs
```

---

## 2. Enumerations

```sql
CREATE TYPE user_role        AS ENUM ('ADMIN','ACCOUNTANT','CONTACT');
CREATE TYPE contact_type     AS ENUM ('CUSTOMER','VENDOR','BOTH');
CREATE TYPE product_type     AS ENUM ('GOODS','SERVICE','COMBO');

-- Fine-grained, user-selectable. Grouped in the CoA dropdown per the mockup.
CREATE TYPE account_type AS ENUM (
  -- Balance Sheet group
  'ASSET_BANK','ASSET_CASH','ASSET_RECEIVABLE','ASSET_OTHER',
  'LIABILITY_PAYABLE','LIABILITY_OTHER','EQUITY',
  -- Profit and Loss group
  'INCOME','EXPENSE','OTHER_EXPENSE'
);
-- Derived from account_type. Drives normal balance + statement membership.
CREATE TYPE account_class AS ENUM ('ASSET','LIABILITY','EQUITY','INCOME','EXPENSE');

CREATE TYPE journal_type       AS ENUM ('SALES','PURCHASE','BANK','CASH');
CREATE TYPE entry_state        AS ENUM ('DRAFT','POSTED','CANCELLED');
CREATE TYPE entry_source_type  AS ENUM ('VENDOR_BILL','CUSTOMER_INVOICE','PAYMENT','MANUAL','REVERSAL');
CREATE TYPE entry_kind         AS ENUM ('PRIMARY','REVERSAL');

CREATE TYPE order_state    AS ENUM ('DRAFT','CONFIRMED','CANCELLED');
CREATE TYPE document_state AS ENUM ('DRAFT','CONFIRMED','CANCELLED');
CREATE TYPE payment_status AS ENUM ('NOT_PAID','PARTIAL','PAID');   -- DERIVED, not stored

CREATE TYPE payment_direction AS ENUM ('SEND','RECEIVE');
CREATE TYPE payment_method    AS ENUM ('BANK','CASH');
CREATE TYPE payment_state     AS ENUM ('DRAFT','POSTED','CANCELLED');
CREATE TYPE allocation_target AS ENUM ('VENDOR_BILL','CUSTOMER_INVOICE');

CREATE TYPE analytic_type AS ENUM ('INCOME','EXPENSE');
CREATE TYPE budget_state  AS ENUM ('DRAFT','CONFIRMED','REVISED','CANCELLED');

CREATE TYPE tax_scope       AS ENUM ('SALE','PURCHASE','BOTH');
CREATE TYPE tax_computation AS ENUM ('PERCENT','FIXED');
```

### 2.1 `account_type` → `account_class` mapping (immutable, in code)

| `account_type` | `account_class` | Normal balance | Statement | Balance Sheet / P&L line |
|---|---|---|---|---|
| `ASSET_BANK` | ASSET | Debit `+1` | BS | Bank |
| `ASSET_CASH` | ASSET | Debit `+1` | BS | Cash |
| `ASSET_RECEIVABLE` | ASSET | Debit `+1` | BS | Debtors |
| `ASSET_OTHER` | ASSET | Debit `+1` | BS | Other Assets |
| `LIABILITY_PAYABLE` | LIABILITY | Credit `−1` | BS | Creditors |
| `LIABILITY_OTHER` | LIABILITY | Credit `−1` | BS | Other Liability |
| `EQUITY` | EQUITY | Credit `−1` | BS | Capital |
| `INCOME` | INCOME | Credit `−1` | P&L | Income from Sales |
| `EXPENSE` | EXPENSE | Debit `+1` | P&L | Purchase Expense |
| `OTHER_EXPENSE` | EXPENSE | Debit `+1` | P&L | Other Expense |

`account_class` is stored as a generated/denormalised column (written by the service from `account_type`) so report queries can `GROUP BY` it without a CASE expression. It is never edited independently.

---

## 3. Master Data Tables

### 3.1 `users`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `name` | varchar(120) | NOT NULL |
| `login_id` | varchar(12) | NOT NULL, UNIQUE, `CHECK (char_length(login_id) BETWEEN 6 AND 12)` |
| `email` | varchar(180) | NOT NULL, UNIQUE |
| `password_hash` | text | NOT NULL (bcrypt, cost 10) |
| `role` | `user_role` | NOT NULL |
| `contact_id` | UUID | NULL, FK → `contacts(id)` ON DELETE RESTRICT. **Required when `role = 'CONTACT'`** |
| `active` | boolean | NOT NULL DEFAULT true |
| `last_login_at` | timestamptz | NULL |
| `created_at` / `updated_at` | timestamptz | NOT NULL |

```sql
-- A portal user MUST be linked to a contact; staff users must NOT be.
ALTER TABLE users ADD CONSTRAINT users_contact_role_consistency CHECK (
  (role = 'CONTACT' AND contact_id IS NOT NULL) OR
  (role <> 'CONTACT' AND contact_id IS NULL)
);
CREATE UNIQUE INDEX users_login_id_key ON users (lower(login_id));
CREATE UNIQUE INDEX users_email_key    ON users (lower(email));
CREATE INDEX users_contact_id_idx      ON users (contact_id);
```

The `CHECK` is the structural guarantee behind portal row-level scoping — a `CONTACT` session always has a `contactId` to filter by.

### 3.2 `contacts`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `name` | varchar(160) | NOT NULL |
| `type` | `contact_type` | NOT NULL |
| `email` | varchar(180) | NULL, UNIQUE (partial, where NOT NULL) |
| `phone` | varchar(24) | NULL |
| `street` | varchar(240) | NULL |
| `city` | varchar(80) | NULL |
| `state` | varchar(80) | NULL |
| `country` | varchar(80) | NULL DEFAULT `'India'` |
| `pincode` | varchar(12) | NULL |
| `image_url` | text | NULL |
| `payment_term_id` | UUID | NULL, FK → `payment_terms(id)` |
| `active` | boolean | NOT NULL DEFAULT true |

```sql
CREATE UNIQUE INDEX contacts_email_key ON contacts (lower(email)) WHERE email IS NOT NULL;
CREATE INDEX contacts_type_active_idx  ON contacts (type, active);
CREATE INDEX contacts_name_trgm_idx    ON contacts USING gin (name gin_trgm_ops);  -- search
```

Vendor pickers filter `type IN ('VENDOR','BOTH')`; customer pickers filter `type IN ('CUSTOMER','BOTH')`.

### 3.3 `product_categories`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `name` | varchar(120) | NOT NULL, UNIQUE |
| `active` | boolean | NOT NULL DEFAULT true |

Created inline from the product form ("Category can be created and saved on the fly").

### 3.4 `products`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `name` | varchar(180) | NOT NULL |
| `type` | `product_type` | NOT NULL DEFAULT `'GOODS'` |
| `category_id` | UUID | NULL, FK → `product_categories(id)` ON DELETE SET NULL |
| `sales_price` | NUMERIC(18,2) | NOT NULL DEFAULT 0, `CHECK (sales_price >= 0)` |
| `cost_price` | NUMERIC(18,2) | NOT NULL DEFAULT 0, `CHECK (cost_price >= 0)` |
| `sales_account_id` | UUID | NULL, FK → `accounts(id)` — overrides the default income account |
| `purchase_account_id` | UUID | NULL, FK → `accounts(id)` — overrides the default expense account |
| `sales_tax_id` | UUID | NULL, FK → `taxes(id)` |
| `purchase_tax_id` | UUID | NULL, FK → `taxes(id)` |
| `image_url` | text | NULL |
| `active` | boolean | NOT NULL DEFAULT true |

```sql
CREATE INDEX products_category_active_idx ON products (category_id, active);
CREATE INDEX products_name_trgm_idx       ON products USING gin (name gin_trgm_ops);
```

`sales_account_id` / `purchase_account_id` are what allow a line's Chart of Account to be defaulted per product rather than globally — the mockup shows the column as editable, defaulted to Sales / Purchase.

### 3.5 `accounts` — Chart of Accounts

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `code` | varchar(20) | NOT NULL, UNIQUE |
| `name` | varchar(160) | NOT NULL |
| `type` | `account_type` | NOT NULL |
| `class` | `account_class` | NOT NULL — derived from `type`, written by the service |
| `is_system` | boolean | NOT NULL DEFAULT false — seeded control accounts, not archivable |
| `active` | boolean | NOT NULL DEFAULT true |

```sql
CREATE INDEX accounts_type_idx        ON accounts (type);
CREATE INDEX accounts_class_idx       ON accounts (class);
CREATE UNIQUE INDEX accounts_code_key ON accounts (code);
```

**Seeded (mandatory — the mockup states "All this accounts are to be pre configured"):**

| Code | Name | `type` | `class` | System |
|---|---|---|---|---|
| 1000 | Bank A/c | `ASSET_BANK` | ASSET | ✔ |
| 1010 | Cash A/c | `ASSET_CASH` | ASSET | ✔ |
| 1100 | Debtors A/c | `ASSET_RECEIVABLE` | ASSET | ✔ |
| 1200 | Input Tax Receivable A/c | `ASSET_OTHER` | ASSET | ✔ |
| 2000 | Creditors A/c | `LIABILITY_PAYABLE` | LIABILITY | ✔ |
| 2100 | Output Tax Payable A/c | `LIABILITY_OTHER` | LIABILITY | ✔ |
| 3000 | Capital A/c | `EQUITY` | EQUITY | ✔ |
| 4000 | Sales Income A/c | `INCOME` | INCOME | ✔ |
| 5000 | Purchase Expense A/c | `EXPENSE` | EXPENSE | ✔ |
| 5900 | Other Expense A/c | `OTHER_EXPENSE` | EXPENSE | ✔ |

The two tax accounts are additions beyond the mockup's list, required by assumption **A1**. They carry zero balance unless a taxed document is created, so the seeded CoA still *displays* exactly as the mockup shows for an untaxed demo.

### 3.6 `journals`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `code` | varchar(10) | NOT NULL, UNIQUE |
| `name` | varchar(120) | NOT NULL |
| `type` | `journal_type` | NOT NULL |
| `default_account_id` | UUID | NOT NULL, FK → `accounts(id)` ON DELETE RESTRICT |
| `active` | boolean | NOT NULL DEFAULT true |

```sql
CREATE INDEX journals_type_idx ON journals (type);
-- Exactly one active journal per type, so the engine can resolve one unambiguously.
CREATE UNIQUE INDEX journals_one_active_per_type ON journals (type) WHERE active;
```

**Seeded:**

| Code | Name | Type | Default Account |
|---|---|---|---|
| SAL | Sales | `SALES` | Sales Income A/c |
| PUR | Purchase | `PURCHASE` | Purchase Expense A/c |
| BNK | Bank | `BANK` | Bank A/c |
| CSH | Cash | `CASH` | Cash A/c |

The partial unique index is a deliberate simplification: the engine resolves "the Sales journal" by type, so allowing two active sales journals would make posting ambiguous. Additional journals can be created but only one per type may be active.

### 3.7 `taxes`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `name` | varchar(80) | NOT NULL |
| `rate` | NUMERIC(7,4) | NOT NULL DEFAULT 0, `CHECK (rate >= 0)` — percentage, e.g. `18.0000` |
| `computation` | `tax_computation` | NOT NULL DEFAULT `'PERCENT'` |
| `scope` | `tax_scope` | NOT NULL DEFAULT `'BOTH'` |
| `is_inclusive` | boolean | NOT NULL DEFAULT false |
| `tax_account_id` | UUID | NOT NULL, FK → `accounts(id)` ON DELETE RESTRICT |
| `active` | boolean | NOT NULL DEFAULT true |

**Seeded:** `GST 18%` (sale → Output Tax Payable, purchase → Input Tax Receivable), `GST 5%`, `No Tax (0%)`.
Default on all document lines is **no tax**, so the UI matches the mockup (**A1**).

### 3.8 `payment_terms`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `name` | varchar(80) | NOT NULL, UNIQUE |
| `days` | integer | NOT NULL DEFAULT 0, `CHECK (days >= 0)` |
| `active` | boolean | NOT NULL DEFAULT true |

**Seeded:** `Immediate (0)`, `15 Days`, `30 Days`, `45 Days`. Creatable inline. `due_date = document_date + days`.

### 3.9 `analytic_accounts`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `name` | varchar(160) | NOT NULL, UNIQUE |
| `type` | `analytic_type` | NOT NULL |
| `active` | boolean | NOT NULL DEFAULT true |

```sql
CREATE INDEX analytic_accounts_type_idx ON analytic_accounts (type, active);
```

Per the mockup: analytics on **invoice** lines map to `INCOME`; analytics on **PO / vendor bill** lines map to `EXPENSE`. The form view lists every budget referencing this account with its committed and achieved figures.

### 3.10 `sequences`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `code` | varchar(40) | NOT NULL, UNIQUE — e.g. `PURCHASE_ORDER` |
| `prefix` | varchar(20) | NOT NULL — e.g. `P`, `Bill/`, `INV/` |
| `use_year` | boolean | NOT NULL DEFAULT false |
| `padding` | integer | NOT NULL DEFAULT 5 |
| `next_number` | integer | NOT NULL DEFAULT 1 |
| `year` | integer | NULL — the year `next_number` currently applies to |

**Seeded:**

| Code | Prefix | Year | Padding | Produces |
|---|---|---|---|---|
| `PURCHASE_ORDER` | `P` | no | 5 | `P00001` |
| `SALES_ORDER` | `S` | no | 5 | `S00001` |
| `VENDOR_BILL` | `Bill/` | yes | 4 | `Bill/2026/0001` |
| `CUSTOMER_INVOICE` | `INV/` | yes | 4 | `INV/2026/0001` |
| `PAYMENT` | `PAY/` | yes | 4 | `PAY/2026/0001` |
| `JOURNAL_ENTRY` | `JE/` | yes | 4 | `JE/2026/0001` |

**Allocation is transactional and row-locked** — this is what prevents duplicate document numbers under concurrent confirms:

```sql
SELECT * FROM sequences WHERE code = $1 FOR UPDATE;   -- inside the caller's transaction
-- if use_year AND year <> EXTRACT(YEAR FROM $date) THEN reset next_number = 1, year = <year>
UPDATE sequences SET next_number = next_number + 1 WHERE id = $id;
-- format: prefix || (use_year ? year || '/' : '') || lpad(n::text, padding, '0')
```

### 3.11 `password_reset_tokens`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | NOT NULL, FK → `users(id)` ON DELETE CASCADE |
| `token_hash` | text | NOT NULL, UNIQUE (SHA-256 of the emailed token) |
| `expires_at` | timestamptz | NOT NULL |
| `used_at` | timestamptz | NULL |

```sql
CREATE INDEX prt_user_idx ON password_reset_tokens (user_id, expires_at);
```

Single-use, 30 minutes. Only the hash is stored.

---

## 4. Accounting Core Tables

These four tables are the ledger. Everything in §5 feeds them; everything in §7 reads them.

### 4.1 `journal_entries`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `number` | varchar(30) | NULL until posted, UNIQUE when set — e.g. `JE/2026/0001` |
| `journal_id` | UUID | NOT NULL, FK → `journals(id)` ON DELETE RESTRICT |
| `date` | DATE | NOT NULL — the accounting date |
| `reference` | varchar(180) | NULL — free text, or the source document number |
| `narration` | text | NULL |
| `state` | `entry_state` | NOT NULL DEFAULT `'DRAFT'` |
| `source_type` | `entry_source_type` | NOT NULL |
| `source_id` | UUID | NULL — the bill / invoice / payment that produced this entry |
| `entry_kind` | `entry_kind` | NOT NULL DEFAULT `'PRIMARY'` |
| `contact_id` | UUID | NULL, FK → `contacts(id)` — the "Partner" column in the list view |
| `total_debit` | NUMERIC(18,2) | NOT NULL DEFAULT 0 — denormalised for list display |
| `total_credit` | NUMERIC(18,2) | NOT NULL DEFAULT 0 |
| `reversed_by_entry_id` | UUID | NULL, FK → `journal_entries(id)` — set when cancelled by reversal |
| `posted_at` | timestamptz | NULL |
| `created_by` | UUID | NULL, FK → `users(id)` |

```sql
-- Every report filters on exactly this pair.
CREATE INDEX je_state_date_idx ON journal_entries (state, date);
CREATE INDEX je_journal_idx    ON journal_entries (journal_id, date);
CREATE INDEX je_source_idx     ON journal_entries (source_type, source_id);
CREATE INDEX je_contact_idx    ON journal_entries (contact_id);

-- ★ IDEMPOTENCY: one primary entry per source document, forever.
CREATE UNIQUE INDEX je_source_unique
  ON journal_entries (source_type, source_id, entry_kind)
  WHERE source_id IS NOT NULL;

-- Posted entries must carry a number; drafts must not.
ALTER TABLE journal_entries ADD CONSTRAINT je_number_when_posted CHECK (
  (state = 'POSTED' AND number IS NOT NULL) OR state <> 'POSTED'
);
```

### 4.2 `journal_entry_lines`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `journal_entry_id` | UUID | NOT NULL, FK → `journal_entries(id)` **ON DELETE CASCADE** |
| `sequence` | integer | NOT NULL DEFAULT 10 |
| `account_id` | UUID | NOT NULL, FK → `accounts(id)` ON DELETE RESTRICT |
| `contact_id` | UUID | NULL, FK → `contacts(id)` — "Partner" |
| `analytic_account_id` | UUID | NULL, FK → `analytic_accounts(id)` |
| `label` | varchar(240) | NULL |
| `debit` | NUMERIC(18,2) | NOT NULL DEFAULT 0 |
| `credit` | NUMERIC(18,2) | NOT NULL DEFAULT 0 |

```sql
-- ★ THE DRIVER INDEX for Balance Sheet, P&L and the account ledger.
CREATE INDEX jel_account_entry_idx ON journal_entry_lines (account_id, journal_entry_id);
CREATE INDEX jel_entry_idx         ON journal_entry_lines (journal_entry_id);
CREATE INDEX jel_analytic_idx      ON journal_entry_lines (analytic_account_id)
  WHERE analytic_account_id IS NOT NULL;

-- ★ Exactly one side, never negative, never zero on both.
ALTER TABLE journal_entry_lines ADD CONSTRAINT jel_single_sided CHECK (
  debit  >= 0
  AND credit >= 0
  AND NOT (debit > 0 AND credit > 0)
  AND (debit > 0 OR credit > 0)
);
```

`ON DELETE CASCADE` is safe here because deletion of a *posted* parent is blocked by the immutability trigger (§4.4). It exists only so a draft entry can be discarded cleanly.

### 4.3 The balance constraint

```sql
CREATE OR REPLACE FUNCTION assert_entry_balanced() RETURNS trigger AS $$
DECLARE
  eid   uuid := COALESCE(NEW.journal_entry_id, OLD.journal_entry_id);
  d     numeric(18,2);
  c     numeric(18,2);
  st    entry_state;
BEGIN
  SELECT state INTO st FROM journal_entries WHERE id = eid;
  IF st IS NULL THEN RETURN NULL; END IF;          -- parent already gone

  SELECT COALESCE(SUM(debit),0), COALESCE(SUM(credit),0)
    INTO d, c FROM journal_entry_lines WHERE journal_entry_id = eid;

  IF d <> c THEN
    RAISE EXCEPTION
      'UNBALANCED_ENTRY: entry % has debit % and credit %', eid, d, c
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NULL;
END $$ LANGUAGE plpgsql;

-- ★ DEFERRABLE INITIALLY DEFERRED is essential: a non-deferred trigger would fire
--   after the first line is inserted and reject every legitimate multi-line entry.
CREATE CONSTRAINT TRIGGER jel_balanced
  AFTER INSERT OR UPDATE OR DELETE ON journal_entry_lines
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION assert_entry_balanced();
```

This is the database-level expression of `SUM(debit) = SUM(credit)`. It fires at `COMMIT`, so no unbalanced entry can ever exist in committed state — regardless of what the application does, or what someone types into `psql`.

### 4.4 The immutability trigger

```sql
CREATE OR REPLACE FUNCTION reject_if_posted() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.state = 'POSTED' THEN
      RAISE EXCEPTION 'IMMUTABLE_ENTRY: posted entry % cannot be deleted', OLD.id;
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.state = 'POSTED' THEN
    -- The ONLY permitted mutation of a posted entry: cancellation via reversal.
    IF NEW.state = 'CANCELLED' AND NEW.reversed_by_entry_id IS NOT NULL
       AND NEW.journal_id = OLD.journal_id
       AND NEW.date       = OLD.date
       AND NEW.total_debit = OLD.total_debit THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'IMMUTABLE_ENTRY: posted entry % cannot be modified', OLD.id;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER je_immutable
  BEFORE UPDATE OR DELETE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION reject_if_posted();

-- Lines of a posted entry are frozen too.
CREATE OR REPLACE FUNCTION reject_if_parent_posted() RETURNS trigger AS $$
DECLARE st entry_state;
BEGIN
  SELECT state INTO st FROM journal_entries
   WHERE id = COALESCE(NEW.journal_entry_id, OLD.journal_entry_id);
  IF st = 'POSTED' THEN
    RAISE EXCEPTION 'IMMUTABLE_ENTRY: lines of a posted entry cannot be changed';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$ LANGUAGE plpgsql;

CREATE TRIGGER jel_immutable
  BEFORE INSERT OR UPDATE OR DELETE ON journal_entry_lines
  FOR EACH ROW EXECUTE FUNCTION reject_if_parent_posted();
```

**Note on ordering:** because `jel_immutable` blocks inserting lines into a posted entry, `postEntry()` must insert the entry as `DRAFT`, insert its lines, then `UPDATE … SET state='POSTED'` — all inside one transaction. The deferred balance trigger fires at commit, so the entry is validated as a whole. This ordering is documented in `CLAUDE.md` because it is easy to get wrong.

---

## 5. Transaction Documents

The four header/line pairs share a deliberate common shape so one generic service and one generic form component serve all of them (`ARCHITECTURE.md §5.3`).

### 5.1 `purchase_orders`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `number` | varchar(30) | NULL until confirmed, UNIQUE when set — `P00001` |
| `vendor_id` | UUID | NOT NULL, FK → `contacts(id)` ON DELETE RESTRICT |
| `order_date` | DATE | NOT NULL DEFAULT `CURRENT_DATE` |
| `state` | `order_state` | NOT NULL DEFAULT `'DRAFT'` |
| `untaxed_amount` | NUMERIC(18,2) | NOT NULL DEFAULT 0 |
| `tax_amount` | NUMERIC(18,2) | NOT NULL DEFAULT 0 |
| `total_amount` | NUMERIC(18,2) | NOT NULL DEFAULT 0 |
| `notes` | text | NULL |
| `created_by` | UUID | NULL, FK → `users(id)` |

```sql
CREATE INDEX po_vendor_state_idx ON purchase_orders (vendor_id, state);
CREATE INDEX po_date_idx         ON purchase_orders (order_date);
```

**No `journal_entry_id`.** Purchase orders are operational and structurally incapable of posting to the ledger.

### 5.2 `purchase_order_lines`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `purchase_order_id` | UUID | NOT NULL, FK → `purchase_orders(id)` ON DELETE CASCADE |
| `sequence` | integer | NOT NULL DEFAULT 10 |
| `product_id` | UUID | NOT NULL, FK → `products(id)` ON DELETE RESTRICT |
| `description` | varchar(240) | NULL |
| `analytic_account_id` | UUID | NULL, FK → `analytic_accounts(id)` — "Budget Analytics" |
| `quantity` | NUMERIC(18,3) | NOT NULL DEFAULT 1, `CHECK (quantity > 0)` |
| `unit_price` | NUMERIC(18,2) | NOT NULL DEFAULT 0, `CHECK (unit_price >= 0)` |
| `tax_id` | UUID | NULL, FK → `taxes(id)` |
| `tax_amount` | NUMERIC(18,2) | NOT NULL DEFAULT 0 |
| `line_total` | NUMERIC(18,2) | NOT NULL DEFAULT 0 — `quantity × unit_price`, tax excluded |

```sql
CREATE INDEX pol_order_idx    ON purchase_order_lines (purchase_order_id);
CREATE INDEX pol_analytic_idx ON purchase_order_lines (analytic_account_id)
  WHERE analytic_account_id IS NOT NULL;
```

### 5.3 `vendor_bills`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `number` | varchar(30) | NULL until confirmed, UNIQUE when set — `Bill/2026/0001` |
| `vendor_id` | UUID | NOT NULL, FK → `contacts(id)` ON DELETE RESTRICT |
| `bill_reference` | varchar(60) | NULL — the vendor's own reference, e.g. `ABC-26-001` |
| `bill_date` | DATE | NOT NULL DEFAULT `CURRENT_DATE` |
| `due_date` | DATE | NULL — `bill_date + payment_term.days` |
| `payment_term_id` | UUID | NULL, FK → `payment_terms(id)` |
| `state` | `document_state` | NOT NULL DEFAULT `'DRAFT'` |
| `source_purchase_order_id` | UUID | NULL, UNIQUE, FK → `purchase_orders(id)` ON DELETE SET NULL |
| `untaxed_amount` | NUMERIC(18,2) | NOT NULL DEFAULT 0 |
| `tax_amount` | NUMERIC(18,2) | NOT NULL DEFAULT 0 |
| `total_amount` | NUMERIC(18,2) | NOT NULL DEFAULT 0 |
| `amount_paid` | NUMERIC(18,2) | NOT NULL DEFAULT 0 — cache of `SUM(allocations)`, always recomputed |
| `journal_entry_id` | UUID | NULL, UNIQUE, FK → `journal_entries(id)` ON DELETE SET NULL |
| `notes` | text | NULL |
| `created_by` | UUID | NULL, FK → `users(id)` |

```sql
CREATE INDEX vb_vendor_state_idx ON vendor_bills (vendor_id, state);
CREATE INDEX vb_date_idx         ON vendor_bills (bill_date);
CREATE INDEX vb_due_date_idx     ON vendor_bills (due_date) WHERE state = 'CONFIRMED';

-- A purchase order can be billed at most once.
CREATE UNIQUE INDEX vb_source_po_key ON vendor_bills (source_purchase_order_id)
  WHERE source_purchase_order_id IS NOT NULL;

ALTER TABLE vendor_bills ADD CONSTRAINT vb_paid_within_total CHECK (
  amount_paid >= 0 AND amount_paid <= total_amount
);
```

**Derived, never stored:**
- `amount_due = total_amount − amount_paid`
- `payment_status`: `due = 0 → PAID` · `0 < due < total → PARTIAL` · `due = total → NOT_PAID`
- The PO back-link button is shown only when `source_purchase_order_id IS NOT NULL` — exactly the mockup's "hide if Bill Created Fresh without PO".

### 5.4 `vendor_bill_lines`

Identical to `purchase_order_lines`, plus one column the mockup requires:

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `vendor_bill_id` | UUID | NOT NULL, FK → `vendor_bills(id)` ON DELETE CASCADE |
| `sequence` | integer | NOT NULL DEFAULT 10 |
| `product_id` | UUID | NOT NULL, FK → `products(id)` ON DELETE RESTRICT |
| **`account_id`** | UUID | **NOT NULL**, FK → `accounts(id)` ON DELETE RESTRICT — "Chart of Account", defaulted to `Purchase Expense A/c` |
| `description` | varchar(240) | NULL |
| `analytic_account_id` | UUID | NULL, FK → `analytic_accounts(id)` |
| `quantity` | NUMERIC(18,3) | NOT NULL DEFAULT 1, `CHECK (quantity > 0)` |
| `unit_price` | NUMERIC(18,2) | NOT NULL DEFAULT 0, `CHECK (unit_price >= 0)` |
| `tax_id` | UUID | NULL, FK → `taxes(id)` |
| `tax_amount` | NUMERIC(18,2) | NOT NULL DEFAULT 0 |
| `line_total` | NUMERIC(18,2) | NOT NULL DEFAULT 0 |

```sql
CREATE INDEX vbl_bill_idx     ON vendor_bill_lines (vendor_bill_id);
CREATE INDEX vbl_account_idx  ON vendor_bill_lines (account_id);
CREATE INDEX vbl_analytic_idx ON vendor_bill_lines (analytic_account_id)
  WHERE analytic_account_id IS NOT NULL;
```

`account_id` being `NOT NULL` on the line is what lets the posting engine read the debit account from the line rather than hard-coding it — the mockup shows the column as populated-by-default but user-editable.

### 5.5 `sales_orders`

Mirror of `purchase_orders`, with `customer_id` in place of `vendor_id` and number `S00001`.

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `number` | varchar(30) | NULL until confirmed, UNIQUE when set |
| `customer_id` | UUID | NOT NULL, FK → `contacts(id)` ON DELETE RESTRICT |
| `order_date` | DATE | NOT NULL DEFAULT `CURRENT_DATE` |
| `state` | `order_state` | NOT NULL DEFAULT `'DRAFT'` |
| `untaxed_amount` / `tax_amount` / `total_amount` | NUMERIC(18,2) | NOT NULL DEFAULT 0 |
| `notes` | text | NULL |
| `created_by` | UUID | NULL, FK → `users(id)` |

```sql
CREATE INDEX so_customer_state_idx ON sales_orders (customer_id, state);
CREATE INDEX so_date_idx           ON sales_orders (order_date);
```

**No `journal_entry_id`.**

### 5.6 `sales_order_lines`

Identical in shape to `purchase_order_lines`, FK `sales_order_id`.

### 5.7 `customer_invoices`

Mirror of `vendor_bills`:

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `number` | varchar(30) | NULL until confirmed, UNIQUE when set — `INV/2026/0001` |
| `customer_id` | UUID | NOT NULL, FK → `contacts(id)` ON DELETE RESTRICT |
| `invoice_reference` | varchar(60) | NULL |
| `invoice_date` | DATE | NOT NULL DEFAULT `CURRENT_DATE` |
| `due_date` | DATE | NULL |
| `payment_term_id` | UUID | NULL, FK → `payment_terms(id)` |
| `state` | `document_state` | NOT NULL DEFAULT `'DRAFT'` |
| `source_sales_order_id` | UUID | NULL, UNIQUE, FK → `sales_orders(id)` ON DELETE SET NULL |
| `untaxed_amount` / `tax_amount` / `total_amount` | NUMERIC(18,2) | NOT NULL DEFAULT 0 |
| `amount_paid` | NUMERIC(18,2) | NOT NULL DEFAULT 0 |
| `journal_entry_id` | UUID | NULL, UNIQUE, FK → `journal_entries(id)` ON DELETE SET NULL |
| `notes` | text | NULL |
| `created_by` | UUID | NULL, FK → `users(id)` |

```sql
-- ★ Drives the contact portal's row-level scoping.
CREATE INDEX ci_customer_state_idx ON customer_invoices (customer_id, state);
CREATE INDEX ci_date_idx           ON customer_invoices (invoice_date);
CREATE INDEX ci_due_date_idx       ON customer_invoices (due_date) WHERE state = 'CONFIRMED';
CREATE UNIQUE INDEX ci_source_so_key ON customer_invoices (source_sales_order_id)
  WHERE source_sales_order_id IS NOT NULL;
ALTER TABLE customer_invoices ADD CONSTRAINT ci_paid_within_total CHECK (
  amount_paid >= 0 AND amount_paid <= total_amount
);
```

### 5.8 `customer_invoice_lines`

Identical to `vendor_bill_lines`, FK `customer_invoice_id`, with `account_id` defaulted to `Sales Income A/c`.

```sql
CREATE INDEX cil_invoice_idx  ON customer_invoice_lines (customer_invoice_id);
CREATE INDEX cil_account_idx  ON customer_invoice_lines (account_id);
CREATE INDEX cil_analytic_idx ON customer_invoice_lines (analytic_account_id)
  WHERE analytic_account_id IS NOT NULL;
```

### 5.9 `payments`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `number` | varchar(30) | NULL until posted, UNIQUE when set — `PAY/2026/0001` |
| `direction` | `payment_direction` | NOT NULL — `SEND` (to vendor) / `RECEIVE` (from customer) |
| `contact_id` | UUID | NOT NULL, FK → `contacts(id)` ON DELETE RESTRICT — "Partner" |
| `payment_date` | DATE | NOT NULL DEFAULT `CURRENT_DATE` |
| `amount` | NUMERIC(18,2) | NOT NULL, `CHECK (amount > 0)` |
| `method` | `payment_method` | NOT NULL DEFAULT `'BANK'` — "Payment Via" |
| `journal_id` | UUID | NOT NULL, FK → `journals(id)` — resolved from `method` (BANK→Bank, CASH→Cash) |
| `note` | varchar(240) | NULL |
| `state` | `payment_state` | NOT NULL DEFAULT `'DRAFT'` |
| `journal_entry_id` | UUID | NULL, UNIQUE, FK → `journal_entries(id)` ON DELETE SET NULL |
| `created_by` | UUID | NULL, FK → `users(id)` |

```sql
CREATE INDEX pay_contact_idx ON payments (contact_id, state);
CREATE INDEX pay_date_idx    ON payments (payment_date);
CREATE INDEX pay_method_idx  ON payments (method);
```

Per assumption **A3**, `journal_id` resolves from `method` — the Bank journal for `BANK`, the Cash journal for `CASH` — not from the source document's journal.

### 5.10 `payment_allocations`

The many-to-many join that makes partial payments possible.

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `payment_id` | UUID | NOT NULL, FK → `payments(id)` ON DELETE CASCADE |
| `target_type` | `allocation_target` | NOT NULL |
| `vendor_bill_id` | UUID | NULL, FK → `vendor_bills(id)` ON DELETE RESTRICT |
| `customer_invoice_id` | UUID | NULL, FK → `customer_invoices(id)` ON DELETE RESTRICT |
| `amount` | NUMERIC(18,2) | NOT NULL, `CHECK (amount > 0)` |

```sql
-- Exactly one target, matching target_type.
ALTER TABLE payment_allocations ADD CONSTRAINT pa_exactly_one_target CHECK (
  (target_type = 'VENDOR_BILL'      AND vendor_bill_id      IS NOT NULL AND customer_invoice_id IS NULL) OR
  (target_type = 'CUSTOMER_INVOICE' AND customer_invoice_id IS NOT NULL AND vendor_bill_id      IS NULL)
);
CREATE INDEX pa_payment_idx ON payment_allocations (payment_id);
CREATE INDEX pa_bill_idx    ON payment_allocations (vendor_bill_id)      WHERE vendor_bill_id      IS NOT NULL;
CREATE INDEX pa_invoice_idx ON payment_allocations (customer_invoice_id) WHERE customer_invoice_id IS NOT NULL;

-- One payment allocates to a given document at most once.
CREATE UNIQUE INDEX pa_unique_bill    ON payment_allocations (payment_id, vendor_bill_id)      WHERE vendor_bill_id      IS NOT NULL;
CREATE UNIQUE INDEX pa_unique_invoice ON payment_allocations (payment_id, customer_invoice_id) WHERE customer_invoice_id IS NOT NULL;
```

**Service invariants** (not expressible as a single `CHECK`, so enforced in `payment.service.ts` inside the transaction):
1. `SUM(allocations.amount) <= payment.amount` for one payment.
2. `SUM(allocations.amount) <= document.total_amount` for one document.
3. After any allocation change, `document.amount_paid` is **recomputed** as `SUM(allocations)` — never incremented in place, because increments drift.

### 5.11 `budgets`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `name` | varchar(160) | NOT NULL |
| `start_date` | DATE | NOT NULL |
| `end_date` | DATE | NOT NULL, `CHECK (end_date >= start_date)` |
| `responsible_contact_id` | UUID | NULL, FK → `contacts(id)` ON DELETE SET NULL |
| `state` | `budget_state` | NOT NULL DEFAULT `'DRAFT'` |
| `revised_from_budget_id` | UUID | NULL, FK → `budgets(id)` ON DELETE SET NULL |
| `revised_to_budget_id` | UUID | NULL, FK → `budgets(id)` ON DELETE SET NULL |
| `revision_number` | integer | NOT NULL DEFAULT 0 |
| `active` | boolean | NOT NULL DEFAULT true |
| `created_by` | UUID | NULL, FK → `users(id)` |

```sql
CREATE INDEX budgets_state_idx  ON budgets (state);
CREATE INDEX budgets_period_idx ON budgets (start_date, end_date);
```

**Revision semantics (from the mockup's stage map):** `Revise` on a `CONFIRMED` budget creates a **new** budget row named `"<original name> Revised"`, copies all lines, sets the original to `REVISED`, and links both directions (`original.revised_to_budget_id → new`, `new.revised_from_budget_id → original`). The original remains permanently visible with a clickable link to its successor. Only `CONFIRMED` budgets participate in the remaining-budget calculation.

### 5.12 `budget_lines`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `budget_id` | UUID | NOT NULL, FK → `budgets(id)` ON DELETE CASCADE |
| `sequence` | integer | NOT NULL DEFAULT 10 |
| `analytic_account_id` | UUID | NOT NULL, FK → `analytic_accounts(id)` ON DELETE RESTRICT |
| `type` | `analytic_type` | NOT NULL — mirrors the analytic account's type |
| `committed_amount` | NUMERIC(18,2) | NOT NULL DEFAULT 0, `CHECK (committed_amount >= 0)` |

```sql
CREATE INDEX bl_budget_idx ON budget_lines (budget_id);
CREATE UNIQUE INDEX bl_unique_analytic ON budget_lines (budget_id, analytic_account_id);
```

**`achieved_amount`, `achieved_pct` and `amount_to_achieve` are NOT columns.** They are computed on read (see §7.4) exactly as the mockup's field-explanation table specifies. Storing them would violate the "derive, don't maintain" rule and would go stale the moment an invoice was posted.

### 5.13 `audit_logs` (P2)

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | NULL, FK → `users(id)` ON DELETE SET NULL |
| `action` | varchar(60) | NOT NULL — e.g. `BILL_CONFIRMED` |
| `entity_type` | varchar(60) | NOT NULL |
| `entity_id` | UUID | NULL |
| `metadata` | jsonb | NULL |
| `created_at` | timestamptz | NOT NULL DEFAULT now() |

```sql
CREATE INDEX al_entity_idx ON audit_logs (entity_type, entity_id, created_at DESC);
```

---

## 6. Double-Entry Accounting — How It Works

### 6.1 The five invariants

| # | Invariant | Where enforced |
|---|---|---|
| 1 | `SUM(debit) = SUM(credit)` for every entry | `postEntry()` **and** the deferred constraint trigger (§4.3) |
| 2 | Each line is debit **or** credit, non-negative, never both, never neither | `CHECK jel_single_sided` (§4.2) |
| 3 | Posted entries are immutable; corrections are reversals | Triggers `je_immutable` + `jel_immutable` (§4.4) |
| 4 | One posting entry per source document, ever | `UNIQUE je_source_unique` (§4.1) |
| 5 | Drafts never reach the ledger | Draft documents have `journal_entry_id = NULL`; every report filters `state = 'POSTED'` |

Negative amounts are never used to express direction. A reduction is expressed by placing the amount on the opposite side. This keeps `SUM(debit)` and `SUM(credit)` meaningful and makes invariant 1 a genuine check rather than a tautology.

### 6.2 Normal balance

| Class | Increases with | Decreases with | Report sign |
|---|---|---|---|
| ASSET | Debit | Credit | `+1` |
| EXPENSE | Debit | Credit | `+1` |
| LIABILITY | Credit | Debit | `−1` |
| EQUITY | Credit | Debit | `−1` |
| INCOME | Credit | Debit | `−1` |

`raw_balance = SUM(debit) − SUM(credit)`; presentation value `= raw_balance × sign`.

---

### 6.3 Mapping 1 — Customer Invoice confirmed

**Journal:** Sales (`SAL`) · **Trigger:** `state DRAFT → CONFIRMED` · **Source:** `CUSTOMER_INVOICE`

| Side | Account | Amount |
|---|---|---|
| **Debit** | `Debtors A/c` (`ASSET_RECEIVABLE`) | `total_amount` (inclusive of tax) |
| **Credit** | *each line's* `account_id` (default `Sales Income A/c`) | that line's `line_total` |
| **Credit** | each tax's `tax_account_id` (`Output Tax Payable A/c`) | tax grouped by account |

Worked example — invoice `INV/2026/0001`, Nimesh Pathak, 5 × Office Chair @ ₹2,100, no tax:

```
Journal: Sales          Date: 2026-01-15        Ref: INV/2026/0001
┌──────────────────────────┬──────────────┬────────────┬────────────┐
│ Account                  │ Partner      │      Debit │     Credit │
├──────────────────────────┼──────────────┼────────────┼────────────┤
│ Debtors A/c              │ N. Pathak    │  10,500.00 │            │
│ Sales Income A/c         │ N. Pathak    │            │  10,500.00 │
├──────────────────────────┴──────────────┼────────────┼────────────┤
│                                   TOTAL │  10,500.00 │  10,500.00 │ ✔
└─────────────────────────────────────────┴────────────┴────────────┘
```

With 18% GST (untaxed ₹10,500, tax ₹1,890, total ₹12,390):

```
│ Debtors A/c              │ N. Pathak    │  12,390.00 │            │
│ Sales Income A/c         │ N. Pathak    │            │  10,500.00 │
│ Output Tax Payable A/c   │              │            │   1,890.00 │
│                                   TOTAL │  12,390.00 │  12,390.00 │ ✔
```

**Effect:** Debtors ↑ (asset), Sales Income ↑ (income → P&L), tax liability ↑.

---

### 6.4 Mapping 2 — Customer Payment received

**Journal:** Bank (`BNK`) or Cash (`CSH`), per `method` · **Trigger:** `payment.state DRAFT → POSTED` · **Direction:** `RECEIVE`

| Side | Account | Amount |
|---|---|---|
| **Debit** | `Bank A/c` (`ASSET_BANK`) or `Cash A/c` (`ASSET_CASH`) | `payment.amount` |
| **Credit** | `Debtors A/c` (`ASSET_RECEIVABLE`) | `payment.amount` |

```
Journal: Bank           Date: 2026-01-20        Ref: PAY/2026/0001 · INV/2026/0001
┌──────────────────────────┬──────────────┬────────────┬────────────┐
│ Bank A/c                 │ N. Pathak    │  10,500.00 │            │
│ Debtors A/c              │ N. Pathak    │            │  10,500.00 │
│                                   TOTAL │  10,500.00 │  10,500.00 │ ✔
└─────────────────────────────────────────┴────────────┴────────────┘
```

**Effect:** Bank ↑, Debtors ↓. The invoice's `amount_paid` is recomputed from allocations → `amount_due = 0` → status `PAID`.
**Partial:** a ₹4,000 payment posts `Dr Bank 4,000 / Cr Debtors 4,000`; `amount_due = 6,500` → status `PARTIAL`. Both P&L and total assets are unaffected — only the composition of assets changes. This matters: recognising revenue at invoice time, not payment time, is accrual accounting done correctly.

---

### 6.5 Mapping 3 — Vendor Bill confirmed

**Journal:** Purchase (`PUR`) · **Trigger:** `state DRAFT → CONFIRMED` · **Source:** `VENDOR_BILL`

| Side | Account | Amount |
|---|---|---|
| **Debit** | *each line's* `account_id` (default `Purchase Expense A/c`) | that line's `line_total` |
| **Debit** | each tax's `tax_account_id` (`Input Tax Receivable A/c`) | tax grouped by account |
| **Credit** | `Creditors A/c` (`LIABILITY_PAYABLE`) | `total_amount` |

Worked example — `Bill/2026/0001`, Azure Furniture, 3 × Wooden Chair @ ₹2,000, no tax:

```
Journal: Purchase       Date: 2026-01-10        Ref: Bill/2026/0001
┌──────────────────────────┬──────────────┬────────────┬────────────┐
│ Purchase Expense A/c     │ Azure Furn.  │   6,000.00 │            │
│ Creditors A/c            │ Azure Furn.  │            │   6,000.00 │
│                                   TOTAL │   6,000.00 │   6,000.00 │ ✔
└─────────────────────────────────────────┴────────────┴────────────┘
```

**Effect:** Purchase Expense ↑ (expense → P&L), Creditors ↑ (liability).

Note the deliberate simplification (assumption **A2**): goods are expensed on receipt rather than capitalised to inventory and later released as COGS. Full perpetual inventory would debit an `Inventory` asset here and credit it at sale — a correct but far larger subsystem. The chosen treatment is standard periodic-inventory accounting and remains internally consistent: the P&L shows purchases as expense in the period incurred, and the Balance Sheet balances.

---

### 6.6 Mapping 4 — Vendor Payment sent

**Journal:** Bank (`BNK`) or Cash (`CSH`), per `method` · **Direction:** `SEND`

| Side | Account | Amount |
|---|---|---|
| **Debit** | `Creditors A/c` (`LIABILITY_PAYABLE`) | `payment.amount` |
| **Credit** | `Bank A/c` or `Cash A/c` | `payment.amount` |

```
Journal: Bank           Date: 2026-01-12        Ref: PAY/2026/0002 · Bill/2026/0001
┌──────────────────────────┬──────────────┬────────────┬────────────┐
│ Creditors A/c            │ Azure Furn.  │   6,000.00 │            │
│ Bank A/c                 │ Azure Furn.  │            │   6,000.00 │
│                                   TOTAL │   6,000.00 │   6,000.00 │ ✔
└─────────────────────────────────────────┴────────────┴────────────┘
```

**Effect:** Creditors ↓, Bank ↓. Bill status → `PAID`.

---

### 6.7 Mapping 5 — Cash transaction

Cash is not a separate document type; it is the `method = 'CASH'` variant of a payment. The mapping differs in exactly two places:

| | Journal | Money account |
|---|---|---|
| Customer receipt in cash | Cash (`CSH`) | `Dr Cash A/c` / `Cr Debtors A/c` |
| Vendor payment in cash | Cash (`CSH`) | `Dr Creditors A/c` / `Cr Cash A/c` |

```
Journal: Cash           Date: 2026-01-22        Ref: PAY/2026/0003 · INV/2026/0002
┌──────────────────────────┬──────────────┬────────────┬────────────┐
│ Cash A/c                 │ N. Pathak    │   3,500.00 │            │
│ Debtors A/c              │ N. Pathak    │            │   3,500.00 │
│                                   TOTAL │   3,500.00 │   3,500.00 │ ✔
└─────────────────────────────────────────┴────────────┴────────────┘
```

Both `Cash A/c` (`ASSET_CASH`) and `Bank A/c` (`ASSET_BANK`) appear as separate lines in the Balance Sheet's asset section, matching the mockup.

---

### 6.8 Mapping 6 — Bank transaction

The `method = 'BANK'` variant (the default). Identical structure to §6.7 with `Bank A/c` and the Bank journal. Covered by the worked examples in §6.4 and §6.6.

**Direct bank entries not tied to a document** (bank charges, owner's capital introduction, miscellaneous expenses) are recorded as **manual journal entries** in the Bank journal, e.g.:

```
Owner introduces capital:      Dr Bank A/c 500,000  / Cr Capital A/c 500,000
Bank charges:                  Dr Other Expense A/c 250 / Cr Bank A/c 250
```

The seed data includes a capital introduction so the Balance Sheet has a realistic opening equity position rather than showing equity composed only of period profit.

---

### 6.9 Mapping 7 — Reversal

Produced by `reverseEntry()`, used by Cancel and Reset to Draft.

| Side | Account | Amount |
|---|---|---|
| **Debit** | each original line's account | that line's **credit** |
| **Credit** | each original line's account | that line's **debit** |

```
Reversal of Bill/2026/0001              entry_kind: REVERSAL
┌──────────────────────────┬──────────────┬────────────┬────────────┐
│ Creditors A/c            │ Azure Furn.  │   6,000.00 │            │
│ Purchase Expense A/c     │ Azure Furn.  │            │   6,000.00 │
│                                   TOTAL │   6,000.00 │   6,000.00 │ ✔
└─────────────────────────────────────────┴────────────┴────────────┘
```

The original stays `POSTED`→`CANCELLED` with `reversed_by_entry_id` set. Both entries remain in the ledger forever; their net effect on every account is zero. Nothing is ever deleted.

---

### 6.10 Full worked cycle — proving the Balance Sheet balances

Starting from an empty ledger with a ₹500,000 capital introduction:

| # | Event | Entry |
|---|---|---|
| 1 | Capital introduced | `Dr Bank 500,000 / Cr Capital 500,000` |
| 2 | Bill/2026/0001 confirmed (₹6,000) | `Dr Purchase Expense 6,000 / Cr Creditors 6,000` |
| 3 | Bill paid by bank | `Dr Creditors 6,000 / Cr Bank 6,000` |
| 4 | INV/2026/0001 confirmed (₹10,500) | `Dr Debtors 10,500 / Cr Sales Income 10,500` |
| 5 | Invoice part-paid in cash ₹3,500 | `Dr Cash 3,500 / Cr Debtors 3,500` |

Resulting ledger:

| Account | Class | Debit | Credit | Balance |
|---|---|---:|---:|---:|
| Bank A/c | ASSET | 500,000 | 6,000 | **494,000** Dr |
| Cash A/c | ASSET | 3,500 | — | **3,500** Dr |
| Debtors A/c | ASSET | 10,500 | 3,500 | **7,000** Dr |
| Creditors A/c | LIABILITY | 6,000 | 6,000 | **0** |
| Capital A/c | EQUITY | — | 500,000 | **500,000** Cr |
| Sales Income A/c | INCOME | — | 10,500 | **10,500** Cr |
| Purchase Expense A/c | EXPENSE | 6,000 | — | **6,000** Dr |
| **Totals** | | **526,000** | **526,000** | ✔ |

**Profit & Loss**

```
Income                                       10,500
  Income from Sales                          10,500
Expenses                                      6,000
  Purchase Expense                            6,000
  Other Expense                                   0
─────────────────────────────────────────────────────
Net Income                                    4,500
```

**Balance Sheet**

```
ASSETS                          LIABILITIES & EQUITY
  Bank              494,000       Creditors                       0
  Cash                3,500       Other Liability                 0
  Debtors             7,000       Capital                   500,000
  Other Assets            0       Current Period Profit       4,500
─────────────────────────      ────────────────────────────────────
  TOTAL ASSETS      504,500       TOTAL LIAB. & EQUITY      504,500  ✔
```

**This is the check that must pass before any report UI is written.** Note that omitting the `Current Period Profit` line would produce 504,500 vs 500,000 — a ₹4,500 discrepancy exactly equal to net income. That is the failure mode described in `PROJECT_PLAN.md §1.6`, and it is why the derived equity line is mandatory rather than optional.

---

## 7. Report Queries

### 7.1 Trial Balance — the single primitive

```sql
SELECT a.id, a.code, a.name, a.type, a.class,
       COALESCE(SUM(l.debit),  0) AS total_debit,
       COALESCE(SUM(l.credit), 0) AS total_credit,
       COALESCE(SUM(l.debit),  0) - COALESCE(SUM(l.credit), 0) AS raw_balance
FROM accounts a
LEFT JOIN journal_entry_lines l ON l.account_id = a.id
LEFT JOIN journal_entries     e ON e.id = l.journal_entry_id
                               AND e.state = 'POSTED'          -- ★ drafts excluded
                               AND e.date BETWEEN $from AND $to
GROUP BY a.id, a.code, a.name, a.type, a.class
ORDER BY a.code;
```

The `LEFT JOIN` keeps zero-balance accounts visible, which the mockup's Balance Sheet requires (it shows `Other Assets` and `Other Liability` lines even when empty). Both statements derive from this one query, which is what guarantees they agree (`ARCHITECTURE.md §10.1`).

### 7.2 Balance Sheet

Run §7.1 with `$from = '-infinity'` (or the earliest entry date) and `$to = as_of_date`, then:

```
Bank            = Σ raw_balance where type = ASSET_BANK
Cash            = Σ raw_balance where type = ASSET_CASH
Debtors         = Σ raw_balance where type = ASSET_RECEIVABLE
Other Assets    = Σ raw_balance where type = ASSET_OTHER
TOTAL ASSETS    = Σ raw_balance where class = ASSET

Creditors       = −Σ raw_balance where type = LIABILITY_PAYABLE
Other Liability = −Σ raw_balance where type = LIABILITY_OTHER
Capital         = −Σ raw_balance where type = EQUITY

Current Period Profit = −Σ raw_balance where class IN ('INCOME','EXPENSE')   -- ★ mandatory
TOTAL LIAB. & EQUITY  = Creditors + Other Liability + Capital + Current Period Profit

ASSERT TOTAL ASSETS == TOTAL LIAB. & EQUITY
```

`−Σ raw_balance where class IN ('INCOME','EXPENSE')` is exactly net income, because income is credit-normal and expense is debit-normal, so the negated sum of both is `credits(income) − debits(expense)`. This is why it can be expressed in one clause rather than two.

### 7.3 Profit & Loss

Run §7.1 with the reporting range, then:

```
Income from Sales = −Σ raw_balance where type = INCOME
Income            = Income from Sales
Purchase Expense  =  Σ raw_balance where type = EXPENSE
Other Expense     =  Σ raw_balance where type = OTHER_EXPENSE
Expenses          = Purchase Expense + Other Expense
Net Income        = Income − Expenses
```

Matches the mockup's field-computation notes line for line.

### 7.4 Budget achieved amount

```sql
-- INCOME budget lines: matching customer invoice lines, posted, in period
SELECT COALESCE(SUM(l.line_total), 0)
FROM customer_invoice_lines l
JOIN customer_invoices i ON i.id = l.customer_invoice_id
WHERE l.analytic_account_id = $analyticId
  AND i.state = 'CONFIRMED'
  AND i.invoice_date BETWEEN $budgetStart AND $budgetEnd;

-- EXPENSE budget lines: matching vendor bill lines, posted, in period
SELECT COALESCE(SUM(l.line_total), 0)
FROM vendor_bill_lines l
JOIN vendor_bills b ON b.id = l.vendor_bill_id
WHERE l.analytic_account_id = $analyticId
  AND b.state = 'CONFIRMED'
  AND b.bill_date BETWEEN $budgetStart AND $budgetEnd;
```

Then:
```
achieved_pct      = committed = 0 ? 0 : (achieved / committed) × 100
amount_to_achieve = committed − achieved
```

### 7.5 Remaining budget (drives the non-blocking warning)

```
remaining(analytic, date) =
    committed_amount  from the CONFIRMED budget whose period contains `date`
  − achieved_amount   for that same analytic and period (§7.4)
```

Returns `NULL` when no confirmed budget covers the date — there is nothing to warn about. Called on PO/Bill confirm to build `warnings[]`, and debounced from the line editor to feed the live meter.

### 7.6 Account ledger (drill-down target)

```sql
SELECT e.date, e.number, e.reference, j.name AS journal, c.name AS partner,
       l.label, l.debit, l.credit,
       SUM(l.debit - l.credit) OVER (ORDER BY e.date, e.number, l.sequence) AS running_balance,
       e.source_type, e.source_id
FROM journal_entry_lines l
JOIN journal_entries e ON e.id = l.journal_entry_id
JOIN journals        j ON j.id = e.journal_id
LEFT JOIN contacts   c ON c.id = l.contact_id
WHERE l.account_id = $accountId
  AND e.state = 'POSTED'
  AND e.date BETWEEN $from AND $to
ORDER BY e.date, e.number, l.sequence;
```

`source_type` and `source_id` are selected specifically so each row can link back to its originating bill, invoice or payment — the second half of the D2 bidirectional drill-down.

### 7.7 Stock report (assumption A2)

```sql
SELECT p.id, p.name,
       COALESCE(bl.qty_in,  0)                            AS qty_in,
       COALESCE(il.qty_out, 0)                            AS qty_out,
       COALESCE(bl.qty_in, 0) - COALESCE(il.qty_out, 0)   AS qty_on_hand
FROM products p
LEFT JOIN (
  SELECT l.product_id, SUM(l.quantity) AS qty_in
  FROM vendor_bill_lines l JOIN vendor_bills b ON b.id = l.vendor_bill_id
  WHERE b.state = 'CONFIRMED' AND b.bill_date <= $asOf
  GROUP BY l.product_id
) bl ON bl.product_id = p.id
LEFT JOIN (
  SELECT l.product_id, SUM(l.quantity) AS qty_out
  FROM customer_invoice_lines l JOIN customer_invoices i ON i.id = l.customer_invoice_id
  WHERE i.state = 'CONFIRMED' AND i.invoice_date <= $asOf
  GROUP BY l.product_id
) il ON il.product_id = p.id
WHERE p.type = 'GOODS' AND p.active
ORDER BY p.name;
```

Quantity only — no valuation, no COGS posting. Opening stock is zero by definition.

### 7.8 Ledger Integrity checks (differentiator D1)

```sql
-- 1. Every posted entry balances
SELECT e.id, e.number, SUM(l.debit) d, SUM(l.credit) c
FROM journal_entries e JOIN journal_entry_lines l ON l.journal_entry_id = e.id
WHERE e.state = 'POSTED' GROUP BY e.id, e.number HAVING SUM(l.debit) <> SUM(l.credit);
-- EXPECT: 0 rows

-- 2. Balance Sheet balances  →  §7.2, assert delta = 0

-- 3. Debtors control account == Σ open invoice balances
SELECT
  (SELECT COALESCE(SUM(l.debit - l.credit),0)
     FROM journal_entry_lines l JOIN journal_entries e ON e.id = l.journal_entry_id
     JOIN accounts a ON a.id = l.account_id
    WHERE a.type = 'ASSET_RECEIVABLE' AND e.state = 'POSTED')                    AS control,
  (SELECT COALESCE(SUM(total_amount - amount_paid),0)
     FROM customer_invoices WHERE state = 'CONFIRMED')                           AS subledger;
-- EXPECT: equal

-- 4. Creditors control account == Σ open bill balances   (mirror of 3, LIABILITY_PAYABLE)

-- 5. No two-sided lines            → CHECK makes this structurally impossible; assert anyway
-- 6. No duplicate source entries   → UNIQUE index makes this impossible; assert anyway
-- 7. No posted entry on a draft document
SELECT b.id FROM vendor_bills b JOIN journal_entries e ON e.id = b.journal_entry_id
WHERE b.state = 'DRAFT' AND e.state = 'POSTED';
-- EXPECT: 0 rows
```

Checks 5 and 6 are asserted even though database constraints make them unreachable — the point of the panel is to *demonstrate* the guarantees, and a check that can never fail is still worth showing green.

---

## 8. Seed Data Summary

| Table | Rows | Notes |
|---|---|---|
| `accounts` | 10 | §3.5 — mandatory, pre-configured |
| `journals` | 4 | §3.6 — Sales, Purchase, Bank, Cash |
| `taxes` | 3 | No Tax (default), GST 18%, GST 5% |
| `payment_terms` | 4 | Immediate, 15, 30, 45 days |
| `sequences` | 6 | §3.10 |
| `users` | 3 | `admin` (ADMIN), `accountant1` (ACCOUNTANT), `nimeshp` (CONTACT → Nimesh Pathak) |
| `contacts` | 6+ | Azure Furniture (Vendor), Nimesh Pathak (Customer), Open Wood, Joey Wills, Rahul Sharma, plus a BOTH example |
| `product_categories` | 3 | Furniture, Electronics, Services |
| `products` | 6+ | Office Chair, Wooden Table, Sofa, Dining Table, Wooden Chair, one Service |
| `analytic_accounts` | 3 | Furniture (Expense), Project 1 (Income), Marketing (Expense) |
| `budgets` | 2 | `January 2026` confirmed; one revised pair to demonstrate the lifecycle |
| Documents | ~20 | Generated by the D4 demo-story script **through the service layer**, never raw SQL |
| Opening entry | 1 | Manual JE: `Dr Bank 500,000 / Cr Capital 500,000` |

**The demo-story generator must call the real services**, so every journal entry is produced by the engine. Seeding documents with raw `INSERT`s would bypass the invariants and the Integrity panel would then be validating nothing.

---

## 9. Complexity Assessment

**25 tables. High table count, moderate conceptual complexity, very high structural repetition.**

| Group | Tables | Complexity | Note |
|---|---|---|---|
| Master data | 9 (`users`, `contacts`, `product_categories`, `products`, `accounts`, `journals`, `taxes`, `payment_terms`, `analytic_accounts`) | **Low** | Flat CRUD. Two generic UI components cover all of them. |
| Ledger | 2 (`journal_entries`, `journal_entry_lines`) | **High** | The intellectual core: 5 invariants, 3 triggers, 1 unique index. Deserves the most care and all of the test budget. |
| Documents | 8 (4 header/line pairs) | **Medium** | Near-identical shape → one generic service + one generic form. 8 tables, ~2 tables' worth of work. |
| Payments | 2 (`payments`, `payment_allocations`) | **Medium** | Allocation invariants live in the service, not in `CHECK` constraints. |
| Budgets | 2 (`budgets`, `budget_lines`) | **Medium** | The revision-cloning lifecycle is the only non-obvious part. |
| Supporting | 2 (`sequences`, `password_reset_tokens`) + `audit_logs` (P2) | **Low** | `sequences` needs the row lock; otherwise trivial. |

**Where the risk actually is:** not in the table count, but in three specific places —
1. the deferred balance trigger (get `DEFERRABLE INITIALLY DEFERRED` wrong and every entry fails),
2. the `postEntry` insert ordering imposed by the immutability trigger (draft → lines → post, §4.4), and
3. the Current Period Profit line on the Balance Sheet (§6.10).

Everything else is mechanical. Budget the hours accordingly: the 9 master tables are 2.5 hours, the 2 ledger tables are 2.5 hours.

**Freeze this schema at Hour 4.** Additive migrations only afterwards. Mid-build schema churn is the most reliable way to lose a 24-hour hackathon.
