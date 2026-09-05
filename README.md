# LedgerCraft — Enterprise Accounting Platform for Urban Furniture

Next-generation financial intelligence, smart reconciliation, and enterprise ledger management with role-based access control.

## 🚀 Quick Start with Docker (Recommended)

### Prerequisites
- **Docker Desktop** - [Download here](https://www.docker.com/products/docker-desktop/)
- **Node.js 18+** - [Download here](https://nodejs.org/)

### Setup in 3 Easy Steps

```bash
# 1. Start PostgreSQL Database Container
docker-compose up -d postgres

# 2. Install Dependencies
npm install

# 3. Start Development Server
npm run dev
```

### Access Application
- **Frontend**: http://localhost:3000
- **Database**: localhost:5432

### Default Login Credentials

| Role | Login ID | Password |
|------|----------|----------|
| Admin | admin001 | Admin@123456 |
| Accountant | acct001 | Accountant@123456 |
| User | user001 | User@123456 |

**🎉 That's it!** All your data is automatically saved in Docker volume and persists across restarts.

---

## 📚 Documentation

- **[Docker Setup Guide](./DOCKER_SETUP.md)** - Complete Docker instructions
- **[Implementation Summary](./IMPLEMENTATION_SUMMARY.md)** - What's built and what's remaining
- **[Build Status](./BUILD_STATUS.md)** - Detailed progress tracking
- **[Accounting Plan](./ACCOUNTING_PLAN.md)** - Full system roadmap
- **[Quick Start](./QUICK_START.md)** - Alternative setup without Docker

---

## 🏗️ System Architecture

### Technology Stack
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Backend**: Next.js API Routes, PostgreSQL 15
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL in Docker container
- **Authentication**: JWT with role-based access control

### Role-Based Access Control

#### 👑 Admin (Business Owner)
- Full access to all features
- Create/Modify/Archive master data
- Record all transactions
- View all reports
- Manage users and settings

#### 💼 Accountant (Invoicing User)
- Create master data (cannot archive system accounts)
- Record all transactions
- View all reports
- Cannot manage users or settings

#### 👤 Contact (Customer/Vendor)
- View own invoices/bills only
- Make payments
- View transaction history
- Limited dashboard view

---

## ✅ Completed Features (20%)

### Authentication & Authorization ✅
- JWT-based authentication with 7-day expiry
- Three-role system (Admin, Accountant, Contact)
- Permission-based API protection
- Role-based middleware

### Dashboard ✅
- Enterprise KPI cards
- Sales & Purchase snapshots
- Budget visualization
- Recent activity table
- Responsive design

### Contacts Module ✅
- Full CRUD operations
- Contact types: Customer, Vendor, Both
- Search and filtering
- Email uniqueness validation
- Archive functionality (Admin only)

### Products Module ✅
- Full CRUD operations
- Product types: Goods, Service, Combo
- Sales price & cost price
- Stock tracking for Goods
- SKU management
- Category filtering

### Database Schema ✅
- Complete accounting structure
- Double-entry bookkeeping tables
- Default Chart of Accounts
- Sample data included
- Foreign key constraints

---

## ⏳ In Progress (80% Remaining)

### Priority Features
1. **Purchase Workflow** - PO → Bill → Payment with auto journal entries
2. **Sales Workflow** - SO → Invoice → Receipt with auto journal entries
3. **Journal Entries** - Manual accounting entries
4. **Chart of Accounts** - Account hierarchy management
5. **Financial Reports** - Balance Sheet, P&L, Budget Report
6. **Role-Based Dashboards** - Different views per role

---

## 🗄️ Database Schema

### Master Data Tables
- `users` - User authentication
- `contacts` - Customers & Vendors
- `products` - Product catalog
- `chart_of_accounts` - Ledger accounts
- `journals` - Journal types
- `analytic_accounts` - Budget tracking
- `budgets` - Budget master

### Transaction Tables
- `purchase_orders` & `purchase_order_items`
- `vendor_bills` & `vendor_bill_items`
- `sales_orders` & `sales_order_items`
- `customer_invoices` & `customer_invoice_items`
- `payments`

### Accounting Tables
- `journal_entries` - Main accounting record
- `journal_entry_items` - Debit/Credit lines
- `bank_accounts` - Bank account master

---

## 🔧 Docker Management

### Start/Stop Services
```bash
# Start database
docker-compose up -d postgres

# Stop database
docker-compose stop postgres

# View logs
docker-compose logs -f postgres

# Reset database (deletes all data)
docker-compose down -v
docker-compose up -d postgres
```

### Database Access
```bash
# Connect to database
docker exec -it ledgercraft_db psql -U postgres -d ledgercraft

# Create backup
docker exec -t ledgercraft_db pg_dump -U postgres ledgercraft > backup.sql

# Restore backup
docker exec -i ledgercraft_db psql -U postgres ledgercraft < backup.sql
```

### Troubleshooting
```bash
# Port 5432 in use? Stop local PostgreSQL:
net stop postgresql-x64-15

# Container won't start?
docker-compose down -v
docker-compose up -d --build postgres

# Check container status
docker ps
docker-compose logs postgres
```

---

## 📁 Project Structure

```
odoo_hackathon/
├── app/
│   ├── (main)/
│   │   ├── dashboard/page.tsx       ✅ Dashboard
│   │   ├── contacts/                ✅ Contacts module
│   │   ├── products/                ✅ Products module
│   │   ├── purchases/               ⏳ Purchase workflow
│   │   ├── sales/                   ⏳ Sales workflow
│   │   └── reports/                 ⏳ Financial reports
│   ├── layout.tsx                   ✅ Root layout
│   └── globals.css                  ✅ Styles
├── pages/
│   ├── api/
│   │   ├── auth/                    ✅ Auth endpoints
│   │   ├── contacts/                ✅ Contacts APIs
│   │   ├── products/                ✅ Products APIs
│   │   └── [other modules]/         ⏳ Remaining APIs
│   ├── login.tsx                    ✅ Login page
│   ├── signup.tsx                   ✅ Signup page
│   └── create-account.tsx           ✅ Create account
├── components/
│   ├── ui/                          ✅ Reusable components
│   ├── dashboard/                   ✅ Dashboard components
│   └── navigation/                  ✅ Navigation
├── lib/
│   ├── auth-middleware.ts           ✅ Role middleware
│   ├── navigation-config.ts         ✅ Nav config
│   ├── db.ts                        ✅ Database
│   └── auth.ts                      ✅ Auth utilities
├── sql/
│   ├── init.sql                     ✅ User schema
│   └── accounting_schema.sql        ✅ Accounting schema
├── docker-compose.yml               ✅ Docker config
├── Dockerfile                       ✅ App container
└── .env                            ✅ Environment vars
```

---

## 🧪 Testing

### Manual Testing
1. Start Docker: `docker-compose up -d postgres`
2. Start app: `npm run dev`
3. Login as Admin: admin001 / Admin@123456
4. Navigate to:
   - `/contacts` - Create and manage contacts
   - `/products` - Create and manage products
   - `/dashboard` - View dashboard

### Database Verification
```sql
-- Connect to database
docker exec -it ledgercraft_db psql -U postgres -d ledgercraft

-- Verify tables
\dt

-- Check data
SELECT * FROM users;
SELECT * FROM contacts;
SELECT * FROM products;
SELECT * FROM chart_of_accounts;
```

---

## 📊 Progress Metrics

| Category | Completed | Total | Progress |
|----------|-----------|-------|----------|
| Backend APIs | 10 | 70 | 14% |
| Frontend Pages | 8 | 60 | 13% |
| Master Data Modules | 2 | 5 | 40% |
| Transaction Workflows | 0 | 4 | 0% |
| Reports | 0 | 6 | 0% |
| **Overall** | **20** | **141** | **~20%** |

---

## 🎯 Accounting Features

### Automated Journal Entry Generation

#### When Invoice is Posted:
```
Debit: Accounts Receivable (Customer)
Credit: Sales Revenue
Credit: Tax Payable (if tax)
```

#### When Bill is Posted:
```
Debit: Purchase Expense
Debit: Tax Payable (if tax)
Credit: Accounts Payable (Vendor)
```

#### When Payment is Made:
```
Debit: Accounts Payable (Vendor)
Credit: Cash/Bank
```

#### When Payment is Received:
```
Debit: Cash/Bank
Credit: Accounts Receivable (Customer)
```

### Financial Reports (Coming Soon)
- **Balance Sheet** - Assets = Liabilities + Capital
- **Profit & Loss** - Revenue - Expenses = Net Profit
- **Budget Report** - Planned vs Achieved tracking
- **Cash Flow Statement** - Cash inflows and outflows
- **General Ledger** - All transactions by account
- **Trial Balance** - All account balances

---

## 🔐 Security Features

- JWT authentication with secure token storage
- Role-based access control at API level
- Permission checks before sensitive operations
- Contact users can only access their own data
- Admin-only functions (archive, user management)
- Password hashing with bcrypt
- SQL injection prevention
- Input validation on all forms

---

## 🚢 Production Deployment

### Using Docker Compose
```bash
# Build production image
docker-compose build

# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f
```

### Environment Configuration
Update `.env` for production:
```env
NODE_ENV=production
JWT_SECRET=<generate-strong-32-char-secret>
DATABASE_URL=postgresql://postgres:<strong-password>@postgres:5432/ledgercraft
```

### Generate Strong JWT Secret
```bash
# PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

---

## 🤝 Contributing

This is a hackathon project for Urban Furniture's accounting system. 

### Development Workflow
1. Create feature branch
2. Make changes
3. Test locally with Docker
4. Commit with descriptive message
5. Push to repository

---

## 📝 License

Private project for Urban Furniture accounting system.

---

## 💬 Support

For issues or questions:
1. Check [DOCKER_SETUP.md](./DOCKER_SETUP.md)
2. Check [BUILD_STATUS.md](./BUILD_STATUS.md)
3. Review [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)

---

## 🎉 What's Working Now

✅ **Authentication** - Login/Signup/Create Account with role-based access  
✅ **Dashboard** - Enterprise-grade UI with KPIs and charts  
✅ **Contacts** - Full customer/vendor management  
✅ **Products** - Complete product catalog with inventory  
✅ **Database** - Production-ready schema with sample data  
✅ **Docker** - One-command setup with persistent storage  

---

## 🚀 Next Steps

1. ✅ **You are here** - Docker setup complete, database running
2. ⏳ Build Purchase workflow (PO → Bill → Payment)
3. ⏳ Build Sales workflow (SO → Invoice → Receipt)
4. ⏳ Implement automated journal entries
5. ⏳ Create financial reports
6. ⏳ Role-based dashboard views

**Foundation is solid! 20% complete, 80% to go.**

---

Made with ❤️ for Urban Furniture accounting automation
