# Frontend Issues & Solutions

## 🎨 Frontend Stack
- **Framework**: Next.js 14 (React meta-framework)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Package Manager**: npm

---

## ❌ Issue 1: "_app.tsx is not a React Component"

### **What This Means**
Next.js looks for `_app.tsx` to wrap your entire app. If it's not a valid React component, the entire app breaks.

### **Why It Happens**
```typescript
// ❌ WRONG - Generic function names confuse Next.js
function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}

// ❌ WRONG - No default export
export const MyApp = ({ Component, pageProps }: AppProps) => {
  return <Component {...pageProps} />;
};

// ❌ WRONG - Wrong return type
function App({ Component, pageProps }: AppProps) {
  return null;  // Returns null, not JSX
}
```

### **How to Fix**
```typescript
// ✅ CORRECT
import React from 'react';
import type { AppProps } from 'next/app';
import '../styles/globals.css';

function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}

export default MyApp;
```

### **Debug Steps**
1. Verify file is named **exactly** `_app.tsx`
2. Check default export exists
3. Clear `.next` folder: `rm -r .next`
4. Restart dev server: `npm run dev`
5. Check browser console for errors

---

## ❌ Issue 2: Tailwind CSS Classes Not Working

### **Why It Happens**
- Tailwind config not scanning files
- Globals.css not imported
- Tailwind plugins missing
- CSS purging removing classes

### **How to Fix**

**Check 1: Verify tailwind.config.js**
```javascript
// ✅ CORRECT
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',      // ← Scans pages
    './components/**/*.{js,ts,jsx,tsx}',  // ← Scans components
  ],
  theme: { extend: { /* colors, etc */ } },
  plugins: [],
};
```

**Check 2: Verify globals.css imported in _app.tsx**
```typescript
import '../styles/globals.css';  // ← Must be at top
```

**Check 3: Verify globals.css has Tailwind**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Check 4: Rebuild**
```bash
rm -r .next
npm run dev
```

---

## ❌ Issue 3: Components Not Loading / Import Errors

### **Common Import Errors**
```
Module not found: Can't resolve '../components/Button'
Cannot find module './Button'
```

### **Why It Happens**
- File path is wrong
- Missing file extension (.tsx vs .ts)
- Circular imports
- Case sensitivity (Button.tsx vs button.tsx)

### **How to Fix**

**Check 1: Verify file exists**
```bash
# Check if file exists
ls -la c:\Users\AYUSH\Desktop\odoo_hackathon\components\ui\Button.tsx
```

**Check 2: Use correct path**
```typescript
// ❌ WRONG
import Button from '../../components/ui/button';  // lowercase

// ✅ CORRECT
import { Button } from '../ui/Button';  // correct path & case
```

**Check 3: Named vs Default exports**
```typescript
// If you export like this:
export const Button = () => {...}

// Import like this:
import { Button } from '../ui/Button';  // with braces

// If you export like this:
export default Button;

// Import like this:
import Button from '../ui/Button';  // without braces
```

**Check 4: Create barrel exports**
```typescript
// components/ui/index.ts
export { Button } from './Button';
export { Input } from './Input';
export { Logo } from './Logo';

// Then import:
import { Button, Input, Logo } from '../ui';
```

---

## ❌ Issue 4: Form Inputs Not Working

### **Problem**: Can't type in input fields

### **Why It Happens**
- Missing `onChange` handler
- Missing `value` prop
- State not updating
- Component not re-rendering

### **How to Fix**
```typescript
// ❌ WRONG - No onChange
<Input placeholder="Name" />

// ✅ CORRECT
const [name, setName] = useState('');

<Input 
  placeholder="Name"
  value={name}
  onChange={(e) => setName(e.target.value)}
/>
```

**Check Input component has onChange**:
```typescript
// components/ui/Input.tsx
interface InputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;  // ← Required
  // ... other props
}

export const Input: React.FC<InputProps> = ({ value, onChange, ...props }) => {
  return <input value={value} onChange={onChange} {...props} />;
};
```

---

## ❌ Issue 5: Password Toggle Not Working

### **Problem**: Eye icon doesn't show/hide password

### **How to Fix**
```typescript
// Input component must have password toggle logic
const [showPassword, setShowPassword] = useState(false);
const inputType = type === 'password' && showPassword ? 'text' : type;

return (
  <>
    <input type={inputType} {...props} />
    {type === 'password' && (
      <button onClick={() => setShowPassword(!showPassword)}>
        {showPassword ? <EyeOff /> : <Eye />}
      </button>
    )}
  </>
);
```

---

## ❌ Issue 6: Navigation Links Not Working

### **Problem**: Clicking links doesn't navigate

### **How to Fix**
```typescript
// ❌ WRONG - Using <a> tags causes full page reload
<a href="/dashboard">Go to Dashboard</a>

// ✅ CORRECT - Using Next.js Link for client-side navigation
import Link from 'next/link';

<Link href="/dashboard">
  <a>Go to Dashboard</a>
</Link>

// Or in Next.js 13+:
<Link href="/dashboard">Go to Dashboard</Link>
```

---

## ❌ Issue 7: Protected Pages Not Working

### **Problem**: Logged out users can access dashboard

### **How to Fix**
```typescript
// pages/dashboard.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Dashboard() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');  // Redirect to login if no token
      return;
    }
    // Token exists, show dashboard
  }, []);

  return <DashboardLayout>{/* ... */}</DashboardLayout>;
}
```

---

## ❌ Issue 8: localStorage Errors

### **Problem**: `localStorage is not defined`

### **Why It Happens**
- localStorage only exists in browser
- Code runs on server during build

### **How to Fix**
```typescript
// ❌ WRONG - Runs on server
const token = localStorage.getItem('token');

// ✅ CORRECT - Runs only in browser
useEffect(() => {
  const token = localStorage.getItem('token');  // Only runs on client
  console.log(token);
}, []);
```

---

## ✅ Frontend Checklist

- [ ] Can see login page at http://localhost:3001/login?
- [ ] Can type in all form fields?
- [ ] Can toggle password visibility?
- [ ] Blue button shows on hover?
- [ ] Form validation messages show?
- [ ] Can click "Sign Up" link?
- [ ] Can click "Create Account" link?
- [ ] Can click "Forgot Password" link?
- [ ] Tailwind colors apply (blue #2563EB, red #DC2626)?
- [ ] No console errors?

---

## 🔍 Debugging Tips

### **Check Browser Console**
```javascript
// Open: F12 → Console
// See all errors and warnings
```

### **Check Network Tab**
```javascript
// Open: F12 → Network
// See API calls being made
// Check if requests are going to correct URL
```

### **Check Local Storage**
```javascript
// Open: F12 → Application → Local Storage
// See what's stored after login
```

### **Inspect Element**
```javascript
// Open: F12 → Elements
// Check if Tailwind classes are applied
// Look for CSS computed styles
```

---

## 📞 Quick Fixes

```bash
# Clear everything and start fresh
rm -r .next node_modules package-lock.json
npm install
npm run dev

# Clear just Next.js cache
rm -r .next

# Check for TypeScript errors
npm run lint

# Build for production
npm run build
```
