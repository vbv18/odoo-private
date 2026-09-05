# LedgerCraft Architecture - Separated Frontend & Backend

## 🏗️ Project Structure (SEPARATED)

```
odoo_hackathon/
├── 📁 frontend/                    # Next.js Frontend (React UI)
│   ├── pages/                      # Next.js pages & routes
│   ├── components/                 # React components
│   ├── styles/                     # CSS & Tailwind
│   ├── lib/                        # Frontend utilities
│   ├── package.json               # Frontend dependencies
│   ├── tsconfig.json              # TypeScript config
│   ├── tailwind.config.js         # Tailwind config
│   ├── next.config.js             # Next.js config
│   └── .env.local                 # Frontend env vars
│
├── 📁 backend/                     # Express.js Backend (Node API)
│   ├── routes/                     # API routes
│   ├── controllers/                # Business logic
│   ├── middleware/                 # Auth, validation, error handling
│   ├── models/                     # Database queries
│   ├── config/                     # Database config
│   ├── server.ts                   # Express app entry
│   ├── package.json               # Backend dependencies
│   ├── tsconfig.json              # TypeScript config
│   └── .env                       # Backend env vars
│
├── 📁 shared/                      # Shared types & utils
│   ├── types.ts                   # Shared TypeScript types
│   └── constants.ts               # Shared constants
│
└── 📁 sql/                         # Database schema
    └── init.sql                   # PostgreSQL schema
```

## 🎯 Why Separated?

### **Issues with Monolith (Current)**
1. ❌ Mixed concerns - Frontend & Backend logic in same folder
2. ❌ Harder to debug - Can't tell which layer has the error
3. ❌ Deployment complexity - Can't deploy separately
4. ❌ Scaling issues - Frontend and Backend scale differently
5. ❌ Team workflow - Frontend & Backend teams can't work independently
6. ❌ Build complexity - Changes trigger full rebuild

### **Benefits of Separation**
✅ **Clear boundaries** - Frontend only handles UI/UX
✅ **Easy debugging** - Know exactly where issues are
✅ **Independent deployment** - Deploy frontend/backend separately
✅ **Independent scaling** - Scale frontend/backend as needed
✅ **Team independence** - Teams can work in parallel
✅ **Technology flexibility** - Change frontend/backend independently

---

## 📋 Current Issues & Resolutions

### **FRONTEND ISSUES**

#### Issue 1: React Component Export Error
**Problem**: `_app.tsx` not recognized as React Component
**Why It Happens**: 
- Function name must follow specific pattern
- React component must return JSX
- Module bundler can't find valid export

**Resolution**:
```typescript
// ✅ CORRECT
function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
export default MyApp;

// ❌ WRONG - Generic names confuse Next.js
function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
```

#### Issue 2: Styling not loading
**Problem**: Tailwind classes not applying
**Why It Happens**:
- Globals.css not imported in _app.tsx
- Tailwind config not scanning component files
- PostCSS not configured

**Resolution**:
✅ Import globals.css in _app.tsx (already done)
✅ Tailwind config has proper content paths (already done)
✅ PostCSS configured (already done)

#### Issue 3: Components not found
**Problem**: Import errors when components reference each other
**Why It Happens**:
- Relative path issues
- Missing index.ts barrel exports
- Circular dependencies

**Resolution**:
✅ Use consistent import paths
✅ Create index.ts in component folders
✅ Break circular dependencies

---

### **BACKEND ISSUES**

#### Issue 1: Database connection fails
**Problem**: API endpoints throw "Database connection error"
**Why It Happens**:
- PostgreSQL not running
- Connection string wrong in .env
- Connection pool timeout
- Wrong credentials

**Resolution**:
✅ Verify PostgreSQL is running
✅ Check .env DB_HOST, DB_PORT, DB_USER, DB_PASSWORD
✅ Test connection: `psql -U postgres -d ledgercraft`

#### Issue 2: JWT validation fails
**Problem**: Protected endpoints return "Invalid token"
**Why It Happens**:
- JWT_SECRET doesn't match between signing and verification
- Token expired (7-day expiry)
- Token format incorrect (missing "Bearer ")
- Token in wrong header location

**Resolution**:
✅ Ensure JWT_SECRET matches in .env
✅ Check Authorization header format: `Bearer <token>`
✅ Verify token expiry in browser console

#### Issue 3: CORS errors
**Problem**: Frontend can't call backend API
**Why It Happens**:
- Backend not allowing requests from frontend origin
- Missing CORS headers
- Different domains (localhost:3000 vs localhost:3001)
- Credentials not included

**Resolution**:
✅ For development: Backend on same domain (Next.js handles this)
✅ For production: Configure CORS in Express backend

#### Issue 4: Password hashing inconsistency
**Problem**: Login fails even with correct password
**Why It Happens**:
- Bcrypt rounds mismatch
- Plain text passwords in database (not hashed)
- Bcrypt version incompatibility

**Resolution**:
✅ Always hash passwords with bcrypt before storing
✅ Use `await bcrypt.hash(password, 10)` for hashing
✅ Use `await bcrypt.compare(inputPassword, hashedPassword)` for verification

---

## 🔧 Setup Instructions

### **Backend Setup**
```bash
cd backend
npm install
# Create .env file with:
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=ledgercraft
# DB_USER=postgres
# DB_PASSWORD=password
# JWT_SECRET=your-secret-key

npm run dev  # Runs on port 5000
```

### **Frontend Setup**
```bash
cd frontend
npm install
# Create .env.local file with:
# NEXT_PUBLIC_API_URL=http://localhost:5000

npm run dev  # Runs on port 3000
```

---

## 📊 Data Flow

```
User Types in Login Form
    ↓
Frontend validates input (6-12 chars, valid email, etc.)
    ↓
Frontend sends POST to http://localhost:5000/api/auth/login
    ↓
Backend receives request
    ↓
Backend validates input (again - defense in depth)
    ↓
Backend queries PostgreSQL for user
    ↓
Backend compares password with bcrypt
    ↓
Backend generates JWT token
    ↓
Backend sends token back to frontend
    ↓
Frontend stores token in localStorage
    ↓
Frontend sets Authorization header for future requests
    ↓
All subsequent requests include: Authorization: Bearer <token>
```

---

## ✅ Testing Checklist

### **Frontend Tests**
- [ ] Can you see the login page at http://localhost:3000/login?
- [ ] Do form inputs accept text?
- [ ] Does Tailwind styling apply (blue button, borders)?
- [ ] Does password toggle show/hide work?

### **Backend Tests**
- [ ] Can you connect to PostgreSQL? `psql -U postgres -d ledgercraft`
- [ ] Does POST /api/auth/login work? (Test with curl or Postman)
- [ ] Do you get JWT token in response?
- [ ] Can you use token to access protected endpoints?

### **Integration Tests**
- [ ] Can you login from frontend and get dashboard?
- [ ] Does logout clear token?
- [ ] Does expired token redirect to login?

---

## 🚀 Next Steps

1. **Separate into frontend/ and backend/** folders
2. **Create backend/server.ts** with Express setup
3. **Move API routes** from pages/api to backend/routes
4. **Setup environment variables** properly
5. **Test each independently** before integration
6. **Document API endpoints** with Swagger/OpenAPI
7. **Setup Docker** for containerization
