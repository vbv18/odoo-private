'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

interface UserDetail {
  id: string;
  login_id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
}

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [user, setUser] = useState<UserDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: '',
    is_active: true,
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchUser(token);
  }, [id, router]);

  const fetchUser = async (token: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setFormData({
          full_name: data.user.full_name,
          email: data.user.email,
          role: data.user.role,
          is_active: data.user.is_active,
        });
      } else if (res.status === 404) {
        router.push('/users');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        setIsEditing(false);
      } else {
        setErrors({ general: data.message });
      }
    } catch {
      setErrors({ general: 'Network error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this user account?')) return;
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/users/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      router.push('/users');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-[600px] mx-auto px-4 py-8 animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-48 bg-gray-200 rounded" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-[600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <button
          onClick={() => router.push('/users')}
          className="text-[13px] text-[#2563EB] hover:text-blue-700 mb-2 flex items-center gap-1 font-medium"
        >
          ← Back to Users
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-semibold text-[#111827]">{user.full_name}</h1>
            <p className="text-[13px] text-[#667085] font-mono mt-0.5">Login ID: {user.login_id}</p>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <Button onClick={() => setIsEditing(true)} variant="secondary">
                Edit User
              </Button>
            )}
            <Button onClick={handleDelete} variant="secondary" className="text-red-600 border-red-200 hover:bg-red-50">
              Delete
            </Button>
          </div>
        </div>
      </div>

      <form onSubmit={handleUpdate} className="bg-white border border-[#E5E7EB] rounded-enterprise p-6 space-y-4 shadow-xs">
        {errors.general && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-[13px] rounded-enterprise">
            {errors.general}
          </div>
        )}

        <Input
          label="Full Name"
          value={formData.full_name}
          onChange={(e) => setFormData((prev) => ({ ...prev, full_name: e.target.value }))}
          disabled={!isEditing}
          required
        />

        <Input
          label="Email Address"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
          disabled={!isEditing}
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Role & Access Tier"
            value={formData.role}
            onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value }))}
            disabled={!isEditing}
            options={[
              { value: 'Admin', label: 'Admin' },
              { value: 'Accountant', label: 'Accountant' },
              { value: 'Contact', label: 'Contact' },
            ]}
          />

          <Select
            label="Account Status"
            value={formData.is_active ? 'true' : 'false'}
            onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.value === 'true' }))}
            disabled={!isEditing}
            options={[
              { value: 'true', label: 'Active' },
              { value: 'false', label: 'Inactive' },
            ]}
          />
        </div>

        {isEditing && (
          <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
