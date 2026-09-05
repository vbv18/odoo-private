'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PlusIcon, SearchIcon } from '@/components/icons';

interface Contact {
  id: string;
  name: string;
  contact_type: 'Customer' | 'Vendor' | 'Both';
  email: string;
  mobile: string;
  city: string;
  state: string;
  is_archived: boolean;
}

export default function ContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    // Check authentication and get user role
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setUserRole(user.role);

    // Contact users shouldn't access this page
    if (user.role === 'Contact') {
      router.push('/dashboard');
      return;
    }

    fetchContacts();
  }, [filterType]);

  const fetchContacts = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      
      let url = '/api/contacts?';
      if (filterType) url += `type=${filterType}&`;
      if (search) url += `search=${search}&`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setContacts(data.contacts);
      } else {
        console.error('Failed to fetch contacts');
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    fetchContacts();
  };

  const columns = [
    {
      header: 'Name',
      accessor: 'name' as keyof Contact,
    },
    {
      header: 'Type',
      accessor: (row: Contact) => (
        <span
          className={`inline-block px-2 py-1 text-[11px] font-semibold rounded-full ${
            row.contact_type === 'Customer'
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : row.contact_type === 'Vendor'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-purple-50 text-purple-700 border border-purple-200'
          }`}
        >
          {row.contact_type}
        </span>
      ),
    },
    {
      header: 'Email',
      accessor: (row: Contact) => row.email || '-',
    },
    {
      header: 'Mobile',
      accessor: (row: Contact) => row.mobile || '-',
    },
    {
      header: 'Location',
      accessor: (row: Contact) => {
        if (row.city && row.state) return `${row.city}, ${row.state}`;
        if (row.city) return row.city;
        if (row.state) return row.state;
        return '-';
      },
    },
    {
      header: 'Status',
      accessor: (row: Contact) => (
        <span
          className={`inline-block px-2 py-1 text-[11px] font-semibold rounded-full ${
            row.is_archived
              ? 'bg-gray-100 text-gray-600'
              : 'bg-green-50 text-green-700 border border-green-200'
          }`}
        >
          {row.is_archived ? 'Archived' : 'Active'}
        </span>
      ),
    },
  ];

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[24px] font-semibold text-[#111827]">Contacts</h1>
          <p className="text-[14px] text-[#667085] mt-1">
            Manage customers, vendors, and partners
          </p>
        </div>
        <Button
          onClick={() => router.push('/contacts/new')}
          className="flex items-center gap-2"
        >
          <PlusIcon size={16} />
          <span>New Contact</span>
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <SearchIcon
                size={18}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#667085] pointer-events-none"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="flex-1 px-3 py-2 text-[14px] border border-[#E5E7EB] rounded-enterprise focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              <option value="">All Types</option>
              <option value="Customer">Customers</option>
              <option value="Vendor">Vendors</option>
              <option value="Both">Both</option>
            </select>
            <Button onClick={handleSearch} variant="secondary">
              Search
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <Table
        data={contacts}
        columns={columns}
        onRowClick={(contact) => router.push(`/contacts/${contact.id}`)}
        isLoading={isLoading}
        emptyMessage="No contacts found. Create your first contact to get started."
      />
    </div>
  );
}
