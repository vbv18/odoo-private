'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

export default function SettingsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    companyName: '',
    gstin: '',
    email: '',
    phone: '',
    address: '',
    currency: 'INR (₹)',
    financialYearStart: '01 April',
    taxRateDefault: '18',
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchSettings(token);
  }, [router]);

  const fetchSettings = async (token: string) => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/settings/company', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFormData(data.settings);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/settings/company', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setToastMessage('Company settings and fiscal preferences saved successfully!');
        setTimeout(() => setToastMessage(null), 3000);
      }
    } catch {
      alert('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-[800px] mx-auto px-4 py-8 animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4" />
        <div className="h-64 bg-gray-200 rounded" />
      </div>
    );
  }

  return (
    <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-[24px] font-semibold text-[#111827]">Organization Settings</h1>
        <p className="text-[14px] text-[#667085] mt-1">Configure company profiles, GSTIN, fiscal period, and accounting defaults</p>
      </div>

      {toastMessage && (
        <div className="mb-4 p-3.5 bg-green-50 border border-green-200 text-green-700 text-[13px] rounded-enterprise">
          {toastMessage}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Company Identity */}
        <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-6 shadow-xs space-y-4">
          <h2 className="text-[16px] font-bold text-[#111827] border-b border-[#E5E7EB] pb-3">Company Details</h2>

          <Input
            label="Legal Entity Name"
            required
            value={formData.companyName}
            onChange={(e) => setFormData((prev) => ({ ...prev, companyName: e.target.value }))}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="GSTIN / Tax ID"
              value={formData.gstin}
              onChange={(e) => setFormData((prev) => ({ ...prev, gstin: e.target.value }))}
            />

            <Input
              label="Contact Phone"
              value={formData.phone}
              onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
            />
          </div>

          <Input
            label="Official Accounting Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
          />

          <div>
            <label className="block text-[13px] font-medium text-[#111827] mb-1.5">Registered Address</label>
            <textarea
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
              className="w-full px-3.5 py-2 text-[13px] border border-[#E5E7EB] rounded-enterprise focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>
        </div>

        {/* Fiscal Configuration */}
        <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-6 shadow-xs space-y-4">
          <h2 className="text-[16px] font-bold text-[#111827] border-b border-[#E5E7EB] pb-3">Fiscal & Tax Configuration</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Base Currency"
              value={formData.currency}
              onChange={(e) => setFormData((prev) => ({ ...prev, currency: e.target.value }))}
              options={[
                { value: 'INR (₹)', label: 'INR (₹) - Indian Rupee' },
                { value: 'USD ($)', label: 'USD ($) - US Dollar' },
                { value: 'EUR (€)', label: 'EUR (€) - Euro' },
              ]}
            />

            <Select
              label="Fiscal Year Start"
              value={formData.financialYearStart}
              onChange={(e) => setFormData((prev) => ({ ...prev, financialYearStart: e.target.value }))}
              options={[
                { value: '01 April', label: '01 April (Indian Standard)' },
                { value: '01 January', label: '01 January (Calendar Year)' },
              ]}
            />

            <Select
              label="Default GST Rate"
              value={formData.taxRateDefault}
              onChange={(e) => setFormData((prev) => ({ ...prev, taxRateDefault: e.target.value }))}
              options={[
                { value: '0', label: '0% (Exempt)' },
                { value: '5', label: '5% (Essential)' },
                { value: '12', label: '12% (Standard)' },
                { value: '18', label: '18% (Standard Services/Goods)' },
                { value: '28', label: '28% (Luxury)' },
              ]}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </form>
    </div>
  );
}
