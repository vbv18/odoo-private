# Backend Issues & Solutions

## ⚙️ Backend Stack
- **Framework**: Next.js API Routes (Node.js)
- **Language**: TypeScript
- **Database**: PostgreSQL
- **Authentication**: JWT + bcryptjs

---

## ❌ Issue 1: PostgreSQL Connection Fails

### **Error**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
Error: password authentication failed for user "postgres"
```

### **Why It Happens**
1. PostgreSQL not running
2. Wrong connection credentials in .env
3. Database doesn't exist
4. Connection pool exhausted

### **How to Fix**

**Step 1: Verify PostgreSQL is running**
```bash
# Windows - Check if PostgreSQL service is running
# Go to: Services → look for "PostgreSQL"
# Or in PowerShell:
Get-Service postgresql*
```

**Step 2: Verify database exists**
```bash
# Connect to PostgreSQL
psql -U postgres

# List databases
\l

# You should see: ledgercraft
```

**Step 3: Create database if missing**
```bash
# As postgres user
createdb ledgercraft

# Verify it exists
psql -U postgres -l | grep ledgercraft
```

**Step 4: Load schema**
```bash
psql -U postgres -d ledgercraft -f sql/init.sql
```

**Step 5: Verify .env credentials**
```env
DB_HOST=localhost      # ← localhost, not 127.0.0.1
DB_PORT=5432          # ← PostgreSQL default port
DB_NAME=ledgercraft    # ← Database you created
DB_USER=postgres       # ← Default PostgreSQL user
DB_PASSWORD=password   # ← Your password
DB_SSL=false           # ← false for local dev
```

**Step 6: Test connection**
```bash
# Test from command line
psql -h localhost -p 5432 -U postgres -d ledgercraft -c "SELECT version();"
```

---

## ❌ Issue 2: Login Endpoint Returns "Invalid Login Id or Password"

### **Error**
Even with correct credentials (admin001 / Admin@123456), login fails.

### **Why It Happens**
1. User doesn't exist in database
2. Password doesn't match (hashing mismatch)
3. Query syntax error
4. User is_active = false

### **How to Fix**

**Step 1: Verify test data exists**
```bash
psql -U postgres -d ledgercraft

# Check users table
SELECT login_id, email, role FROM users;

# You should see:
# admin001  | admin@ledgercraft.com    | admin
# user001   | user@ledgercraft.com     | user
# acct001   | acct@ledgercraft.com     | accountant
```

**Step 2: Verify passwords are hashed**
```bash
SELECT login_id, password_hash FROM users WHERE login_id='admin001';

# Should show: $2a$10$... (bcrypt hash, not plaintext)
```

**Step 3: Check is_active status**
```bash
SELECT login_id, is_active FROM users;

# All should be: true
```

**Step 4: Test login endpoint manually**
```bash
# Using curl or Postman
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "loginId": "admin001",
  "password": "Admin@123456"
}

# Should return:
{
  "token": "eyJhbGc...",
  "user": { "id": "...", "loginId": "admin001", ... }
}
```

**Step 5: Check database query in code**
```typescript
// pages/api/auth/login.ts
const userResult = await query(
  'SELECT id, login_id, email, full_name, password_hash, role, is_active FROM users WHERE login_id = $1 AND is_active = true',
  [loginId]
);

// Debug: log what query returns
console.log('Query result:', userResult.rows);
```

---

## ❌ Issue 3: JWT Token Not Generated

### **Error**
```
Error: secret must be a string or buffer
jwt.sign is not a function
```

### **Why It Happens**
1. JWT_SECRET not in .env
2. JWT library not imported
3. Token generation syntax wrong

### **How to Fix**

**Step 1: Check JWT_SECRET in .env**
```env
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

**Step 2: Verify import**
```typescript
// pages/api/auth/login.ts
import jwt from 'jsonwebtoken';  // ← Must be imported

// Generate token
const token = jwt.sign(
  { userId: user.id, loginId: user.login_id, email: user.email, role: user.role },
  process.env.JWT_SECRET || 'fallback-secret',
  { expiresIn: '7d' }
);
```

**Step 3: Verify package is installed**
```bash
npm list jsonwebtoken

# Should show: jsonwebtoken@9.0.2 (or similar)
```

---

## ❌ Issue 4: Protected Endpoints Return "Unauthorized"

### **Error**
```
Error: Unauthorized
Error: Invalid token
```

### **Why It Happens**
1. Authorization header missing
2. Token format wrong (not "Bearer <token>")
3. JWT_SECRET mismatch
4. Token expired

### **How to Fix**

**Step 1: Verify token is stored after login**
```javascript
// Browser console after login
localStorage.getItem('token');

// Should show: eyJhbGc...
```

**Step 2: Check API call includes Authorization header**
```typescript
// pages/dashboard.tsx
const response = await fetch('/api/dashboard/stats', {
  headers: { 
    'Authorization': `Bearer ${token}`  // ← Format must be "Bearer <token>"
  },
});
```

**Step 3: Verify backend checks header correctly**
```typescript
// pages/api/dashboard/stats.ts
const authHeader = req.headers.authorization;

if (!authHeader || !authHeader.startsWith('Bearer ')) {
  return res.status(401).json({ message: 'Unauthorized' });
}

const token = authHeader.substring(7);  // Remove "Bearer " prefix

try {
  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
} catch (err) {
  return res.status(401).json({ message: 'Invalid token' });
}
```

**Step 4: Check JWT_SECRET matches everywhere**
```typescript
// When creating token (login):
jwt.sign(payload, process.env.JWT_SECRET || 'fallback', { expiresIn: '7d' });

// When verifying token (protected routes):
jwt.verify(token, process.env.JWT_SECRET || 'fallback');

// ⚠️ MUST be identical!
```

**Step 5: Test with Postman**
```
GET http://localhost:3000/api/dashboard/stats
Header: Authorization: Bearer <paste-token-here>
```

---

## ❌ Issue 5: Password Not Hashing / Plain Text Stored

### **Error**
Passwords visible in database: "Admin@123456" instead of "$2a$10$..."

### **Why It Happens**
1. bcrypt not imported
2. Password hashed but wrong syntax
3. Hashing skipped in code

### **How to Fix**

**Step 1: Verify bcrypt import**
```typescript
// pages/api/auth/register.ts
import bcrypt from 'bcryptjs';  // ← Must import

// Hash password before storing
const hashedPassword = await bcrypt.hash(password, 10);

// Then save hashedPassword, not password
```

**Step 2: Verify in database**
```bash
psql -U postgres -d ledgercraft

SELECT login_id, password_hash FROM users;

# Check format:
# admin001  | $2a$10$xZCXkp0c0c3K5R3Q8j7pJuN3vQ8QqQqQqQqQqQqQqQqQqQqQqQqQq
#           ↑ This pattern = bcrypt hash (GOOD)
```

**Step 3: Fix password comparison**
```typescript
// LOGIN: Compare password
const isValid = await bcrypt.compare(inputPassword, hashedPasswordFromDB);

if (!isValid) {
  return res.status(401).json({ message: 'Invalid password' });
}
```

**Step 4: Re-hash all existing passwords**
```bash
# Delete old users and re-create
psql -U postgres -d ledgercraft

DELETE FROM users;
INSERT INTO users (login_id, email, full_name, password_hash, role) VALUES
  ('admin001', 'admin@ledgercraft.com', 'Admin User', 
   '$2a$10$xZCXkp0c0c3K5R3Q8j7pJuN3vQ8QqQqQqQqQqQqQqQqQqQqQqQqQq', 'admin');
```

---

## ❌ Issue 6: Database Validation Not Working

### **Problem**: Duplicate users created, invalid login IDs accepted

### **Why It Happens**
1. Unique constraints not in database
2. Validation logic missing
3. Race condition (two requests at same time)

### **How to Fix**

**Step 1: Verify database constraints**
```bash
psql -U postgres -d ledgercraft

# Check constraints
\d users

# You should see:
# Constraints:
#     "users_pkey" PRIMARY KEY, btree (id)
#     "users_login_id_key" UNIQUE, btree (login_id)
#     "users_email_key" UNIQUE, btree (email)
```

**Step 2: Add constraints if missing**
```sql
ALTER TABLE users ADD CONSTRAINT users_login_id_key UNIQUE (login_id);
ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);
```

**Step 3: Add validation in API**
```typescript
// pages/api/auth/register.ts
if (loginId.length < 6 || loginId.length > 12) {
  return res.status(400).json({ message: 'Invalid login ID length' });
}

// Check for duplicates BEFORE inserting
const existing = await query(
  'SELECT id FROM users WHERE login_id = $1 OR email = $2',
  [loginId, email]
);

if (existing.rows.length > 0) {
  return res.status(409).json({ message: 'User already exists' });
}
```

---

## ❌ Issue 7: API Returns Gibberish / Wrong Content-Type

### **Error**
```
SyntaxError: Unexpected token < in JSON at position 0
```

### **Why It Happens**
1. Content-Type header not set
2. Returning HTML instead of JSON
3. Error page returned instead of API response

### **How to Fix**

**Step 1: Set Content-Type header**
```typescript
// pages/api/auth/login.ts
res.setHeader('Content-Type', 'application/json');  // ← Add this

return res.status(200).json({ token: '...', user: {...} });
```

**Step 2: Ensure all responses are JSON**
```typescript
// ❌ WRONG
return res.status(200).send('Success');

// ✅ CORRECT
return res.status(200).json({ message: 'Success' });
```

**Step 3: Test endpoint directly**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"loginId":"admin001","password":"Admin@123456"}'

# Check response type in headers
```

---

## ✅ Backend Checklist

- [ ] PostgreSQL running?
- [ ] Database created: `ledgercraft`?
- [ ] Schema loaded: `sql/init.sql` run?
- [ ] Test data exists in users table?
- [ ] Can connect: `psql -U postgres -d ledgercraft`?
- [ ] Test login: `POST /api/auth/login` works?
- [ ] JWT token generated?
- [ ] Protected endpoints check Authorization header?
- [ ] Passwords are bcrypt hashed (not plaintext)?
- [ ] Unique constraints on login_id and email?

---

## 📞 Quick API Tests

### **Test Login**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"loginId":"admin001","password":"Admin@123456"}'
```

### **Test Protected Endpoint**
```bash
# First, get token from login response
TOKEN="eyJhbGc..."

curl -X GET http://localhost:3000/api/dashboard/stats \
  -H "Authorization: Bearer $TOKEN"
```

### **Test Database**
```bash
psql -U postgres -d ledgercraft -c "SELECT COUNT(*) FROM users;"
psql -U postgres -d ledgercraft -c "SELECT login_id, role FROM users;"
```

---

## 🐛 Enable Debug Logging

Add this to your API files to see what's happening:

```typescript
// pages/api/auth/login.ts
console.log('Login attempt:', { loginId });
console.log('User found:', userResult.rows[0]);
console.log('Password match:', isValidPassword);
console.log('Token generated:', token.substring(0, 20) + '...');
```

Then check terminal output when making requests.

---

## 🚨 Common Mistakes

1. **❌ Credentials in code** → Use .env files
2. **❌ Plain text passwords** → Always use bcrypt
3. **❌ Missing error handling** → Wrap in try/catch
4. **❌ No input validation** → Validate everything
5. **❌ Hardcoded secrets** → Use environment variables
6. **❌ No logging** → Add console.log for debugging
7. **❌ Race conditions** → Use database constraints
8. **❌ CORS issues** → Configure properly for frontend

