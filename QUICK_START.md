# LedgerCraft - Quick Start Guide

## 🚀 Get Running in 5 Minutes

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Database

**Create PostgreSQL database:**
```bash
createdb ledgercraft
```

**Load schema and test data:**
```bash
psql -U postgres -d ledgercraft -f sql/init.sql
```

### 3. Configure Environment
Edit `.env.local`:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ledgercraft
DB_USER=postgres
DB_PASSWORD=password
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Start Development Server
```bash
npm run dev
```

**Open**: http://localhost:3000

---

## 🔐 Test Accounts

| Login ID | Password | Role |
|----------|----------|------|
| admin001 | Admin@123456 | Admin |
| user001 | User@123456 | User |
| acct001 | Accountant@123456 | Accountant |

---

## 📋 Pages Available

- **Login**: `/login` - Main authentication page
- **Sign Up**: `/signup` - User self-registration (creates User role)
- **Create Account**: `/create-account` - Admin panel to create any role
- **Dashboard**: `/dashboard` - Protected dashboard with financial data
- **Forgot Password**: `/forgot-password` - Password recovery (placeholder)

---

## 🏗️ Project Structure

```
components/          # React components
├── ui/             # Reusable UI components (Button, Input, Logo, etc.)
├── auth/           # Authentication forms
├── layout/         # Layout wrappers (Sidebar, DashboardLayout)
└── dashboard/      # Dashboard components

pages/              # Next.js pages & API routes
├── *.tsx           # Page components
└── api/
    ├── auth/       # Authentication endpoints
    └── dashboard/  # Dashboard endpoints

lib/                # Utility functions
├── db.ts           # PostgreSQL connection
└── auth.ts         # Auth utilities

sql/                # Database
└── init.sql        # Schema & seed data

styles/             # Global styles
```

---

## 🔑 Key Features

✅ **Enterprise Authentication**
- Login with credentials
- Role-based access control
- JWT token (7-day expiry)
- Password hashing with bcrypt

✅ **Three Auth Pages**
- Login (simple credentials)
- Sign Up (self-register as User)
- Create Account (admin creates any role)

✅ **Premium Design**
- Minimalist, professional UI
- Two-column auth layout
- Responsive (mobile, tablet, desktop)
- Dark navy + white color scheme
- Subtle animations & transitions

✅ **Database**
- PostgreSQL with full schema
- UUID primary keys
- Foreign key relationships
- Audit logging
- Test data included

✅ **API Endpoints**
- POST `/api/auth/login` - User login
- POST `/api/auth/register` - User registration
- GET `/api/dashboard/stats` - Financial metrics
- GET `/api/dashboard/transactions` - Recent transactions
- GET `/api/dashboard/alerts` - Risk alerts

---

## ✅ Validation Rules

**Login ID**: 6-12 characters, unique, alphanumeric + underscore
**Email**: Valid format, unique in database
**Password**: 8+ chars, uppercase, lowercase, special character

---

## 🛠️ Available Commands

```bash
npm run dev       # Start development server
npm run build     # Production build
npm start         # Start production server
npm run lint      # Run linter
```

---

## 🌐 GitHub Repository

https://github.com/xprince18/odoo_finals

All code is pushed and ready to clone!

---

## 📞 Support

For detailed documentation, see:
- `PROJECT_STATUS.md` - Full project overview
- `AUTHENTICATION_GUIDE.md` - Auth system details
- `sql/init.sql` - Database schema

---

**Status**: ✅ Production Ready
**Last Updated**: September 5, 2026
