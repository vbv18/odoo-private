'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { PlusIcon } from '@/components/icons';

interface User {
  id: string;
  login_id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
}

const ROLE_COLORS: Record<string, string> = {
  Admin: 'bg-purple-50 text-purple-700 border-purple-200',
  Accountant: 'bg-blue-50 text-blue-700 border-blue-200',
  Contact: 'bg-green-50 text-green-700 border-green-200',
};

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchUsers(token);
  }, [router]);

  const fetchUsers = async (token: string) => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[24px] font-semibold text-[#111827]">User Management</h1>
          <p className="text-[14px] text-[#667085] mt-1">Manage system operators, assign roles, and administer permissions</p>
        </div>
        <Button onClick={() => router.push('/users/new')} className="flex items-center gap-2">
          <PlusIcon size={16} />
          <span>New User</span>
        </Button>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-enterprise overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-8 space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-enterprise" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-[#667085] text-[14px]">
            No users registered in the system.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F7F8FA] text-[11px] font-semibold text-[#667085] uppercase tracking-wide">
                <th className="text-left py-3 px-4">Full Name</th>
                <th className="text-left py-3 px-4">Login ID</th>
                <th className="text-left py-3 px-4">Email</th>
                <th className="text-left py-3 px-4">Role</th>
                <th className="text-center py-3 px-4">Status</th>
                <th className="text-right py-3 px-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => router.push(`/users/${u.id}`)}
                  className="border-b border-[#F3F4F6] text-[13px] hover:bg-[#F7F8FA] cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4 font-semibold text-[#111827]">{u.full_name}</td>
                  <td className="py-3 px-4 font-mono text-[#2563EB]">{u.login_id}</td>
                  <td className="py-3 px-4 text-[#667085]">{u.email}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-block px-2.5 py-0.5 text-[11px] font-semibold rounded-full border ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-700'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${u.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-[12px] text-[#667085]">{u.is_active ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/users/${u.id}`);
                      }}
                      className="text-[12px] text-[#2563EB] hover:underline font-medium"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
