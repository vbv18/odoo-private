'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

interface Contact {
  id: string;
  name: string;
  contact_type: 'Customer' | 'Vendor' | 'Both';
  email: string;
  mobile: string;
  city: string;
  state: string;
  pincode: string;
  address: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export default function ContactDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [contact, setContact] = useState<Contact | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [userRole, setUserRole] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    contact_type: '',
    email: '',
    mobile: '',
    city: '',
    state: '',
    pincode: '',
    address: '',
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setUserRole(user.role);
    fetchContact(token);
  }, [id]);

  const fetchContact = async (token?: string) => {
    try {
      setIsLoading(true);
      const t = token || localStorage.getItem('token');
      const res = await fetch(`/api/contacts/${id}`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        const data = await res.json();
        setContact(data.contact);
        setFormData({
          name: data.contact.name || '',
          contact_type: data.contact.contact_type || '',
          email: data.contact.email || '',
          mobile: data.contact.mobile || '',
          city: data.contact.city || '',
          state: data.contact.state || '',
          pincode: data.contact.pincode || '',
          address: data.contact.address || '',
        });
      } else if (res.status === 404) {
        router.push('/contacts');
      }
    } catch (err) {
      console.error('Error fetching contact:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.contact_type) newErrors.contact_type = 'Contact type is required';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/contacts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        setContact(data.contact);
        setIsEditing(false);
        setErrors({});
      } else {
        setErrors({ general: data.message || 'Failed to update contact' });
      }
    } catch {
      setErrors({ general: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = async () => {
    if (!window.confirm('Archive this contact? They will no longer appear in active lists.')) return;
    setIsArchiving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/contacts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        router.push('/contacts');
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to archive contact');
      }
    } catch {
      alert('Network error. Please try again.');
    } finally {
      setIsArchiving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4" />
          <div className="h-48 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!contact) return null;

  return (
    <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/contacts')}
          className="text-[13px] text-[#2563EB] hover:text-blue-700 mb-2"
        >
          ← Back to Contacts
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-semibold text-[#111827]">{contact.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded-full ${
                contact.contact_type === 'Customer' ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : contact.contact_type === 'Vendor' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-purple-50 text-purple-700 border border-purple-200'
              }`}>
                {contact.contact_type}
              </span>
              {contact.is_archived && (
                <span className="inline-block px-2 py-0.5 text-[11px] font-semibold rounded-full bg-gray-100 text-gray-600">
                  Archived
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {!isEditing && !contact.is_archived && (
              <Button onClick={() => setIsEditing(true)} variant="secondary">
                Edit
              </Button>
            )}
            {userRole === 'Admin' && !contact.is_archived && (
              <Button
                onClick={handleArchive}
                variant="secondary"
                disabled={isArchiving}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                {isArchiving ? 'Archiving...' : 'Archive'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white border border-[#E5E7EB] rounded-enterprise p-6 space-y-5">
        {errors.general && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-enterprise text-[13px] text-[#DC2626]">
            {errors.general}
          </div>
        )}

        {/* Basic Information */}
        <div>
          <h3 className="text-[16px] font-semibold text-[#111827] mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Input
                label="Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                error={errors.name}
                required
                disabled={!isEditing}
                placeholder="Enter contact name"
              />
            </div>
            <Select
              label="Contact Type"
              name="contact_type"
              value={formData.contact_type}
              onChange={handleChange}
              error={errors.contact_type}
              required
              disabled={!isEditing}
              options={[
                { value: 'Customer', label: 'Customer' },
                { value: 'Vendor', label: 'Vendor' },
                { value: 'Both', label: 'Both (Customer & Vendor)' },
              ]}
            />
          </div>
        </div>

        {/* Contact Information */}
        <div className="pt-4 border-t border-[#E5E7EB]">
          <h3 className="text-[16px] font-semibold text-[#111827] mb-4">Contact Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              disabled={!isEditing}
              placeholder="email@example.com"
            />
            <Input
              label="Mobile"
              type="tel"
              name="mobile"
              value={formData.mobile}
              onChange={handleChange}
              disabled={!isEditing}
              placeholder="+91 98765 43210"
            />
          </div>
        </div>

        {/* Address */}
        <div className="pt-4 border-t border-[#E5E7EB]">
          <h3 className="text-[16px] font-semibold text-[#111827] mb-4">Address</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-[#111827] mb-1.5">
                Street Address
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows={3}
                disabled={!isEditing}
                className="w-full px-3.5 py-2.5 text-[14px] border border-[#E5E7EB] rounded-enterprise focus:outline-none focus:ring-2 focus:ring-[#2563EB] disabled:bg-[#F7F8FA] disabled:text-[#667085]"
                placeholder="Enter full address"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input label="City" name="city" value={formData.city} onChange={handleChange} disabled={!isEditing} placeholder="City" />
              <Input label="State" name="state" value={formData.state} onChange={handleChange} disabled={!isEditing} placeholder="State" />
              <Input label="Pincode" name="pincode" value={formData.pincode} onChange={handleChange} disabled={!isEditing} placeholder="Pincode" />
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="pt-4 border-t border-[#E5E7EB] grid grid-cols-2 gap-4">
          <div>
            <p className="text-[12px] text-[#667085]">Created</p>
            <p className="text-[13px] text-[#111827] font-medium">
              {new Date(contact.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div>
            <p className="text-[12px] text-[#667085]">Last Updated</p>
            <p className="text-[13px] text-[#111827] font-medium">
              {new Date(contact.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Edit Actions */}
        {isEditing && (
          <div className="pt-4 border-t border-[#E5E7EB] flex gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsEditing(false);
                setErrors({});
                if (contact) {
                  setFormData({
                    name: contact.name || '',
                    contact_type: contact.contact_type || '',
                    email: contact.email || '',
                    mobile: contact.mobile || '',
                    city: contact.city || '',
                    state: contact.state || '',
                    pincode: contact.pincode || '',
                    address: contact.address || '',
                  });
                }
              }}
            >
              Cancel
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
