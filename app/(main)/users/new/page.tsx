'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

export default function NewUserPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    name: '',
    loginId: '',
    email: '',
    password: '',
    role: 'Accountant',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrors({ name: 'Full name is required' });
      return;
    }
    if (!formData.email.trim()) {
      setErrors({ email: 'Email is required' });
      return;
    }
    if (!formData.password || formData.password.length < 6) {
      setErrors({ password: 'Password must be at least 6 characters' });
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        router.push('/users');
      } else {
        setErrors({ general: data.message || 'Failed to create user' });
      }
    } catch {
      setErrors({ general: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-[600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <button
          onClick={() => router.push('/users')}
          className="text-[13px] text-[#2563EB] hover:text-blue-700 mb-2 flex items-center gap-1 font-medium"
        >
          ← Back to Users
        </button>
        <h1 className="text-[24px] font-semibold text-[#111827]">New User Account</h1>
        <p className="text-[14px] text-[#667085] mt-1">Create user credentials and designate permission tier</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-[#E5E7EB] rounded-enterprise p-6 space-y-4 shadow-xs">
        {errors.general && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-[13px] rounded-enterprise">
            {errors.general}
          </div>
        )}

        <Input
          label="Full Name"
          required
          value={formData.name}
          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
          error={errors.name}
          placeholder="e.g. Priya Sharma"
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Login ID (Optional)"
            value={formData.loginId}
            onChange={(e) => setFormData((prev) => ({ ...prev, loginId: e.target.value }))}
            placeholder="e.g. priya.s"
          />

          <Select
            label="Role & Access Tier"
            required
            value={formData.role}
            onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value }))}
            options={[
              { value: 'Admin', label: 'Admin (Full Access)' },
              { value: 'Accountant', label: 'Accountant (Transactions & Reports)' },
              { value: 'Contact', label: 'Contact (Client Portal Only)' },
            ]}
          />
        </div>

        <Input
          label="Email Address"
          type="email"
          required
          value={formData.email}
          onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
          error={errors.email}
          placeholder="priya@urbanfurniture.com"
        />

        <Input
          label="Initial Password"
          type="password"
          required
          value={formData.password}
          onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
          error={errors.password}
          placeholder="Minimum 6 characters"
        />

        <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating User...' : 'Create User'}
          </Button>
        </div>
      </form>
    </div>
  );
}
