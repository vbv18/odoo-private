'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { UserRole, normalizeRole } from '@/lib/roles';

interface AuthUser {
  loginId?: string;
  name?: string;
  email?: string;
  role: UserRole;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (!storedToken) {
      // Not authenticated — redirect to login
      router.replace('/login');
      setIsLoading(false);
      return;
    }

    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser({
          loginId: parsed.loginId,
          // login API returns fullName, signup may return name
          name: parsed.fullName || parsed.name || parsed.loginId,
          email: parsed.email,
          role: normalizeRole(parsed.role),
        });
      } catch {
        // Corrupted user data — re-login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.replace('/login');
        setIsLoading(false);
        return;
      }
    }

    setToken(storedToken);
    setIsLoading(false);
  }, [router]);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
