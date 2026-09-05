'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PlusIcon, SearchIcon } from '@/components/icons';

interface Product {
  id: string;
  name?: string;
  product_name?: string;
  product_type?: 'Goods' | 'Service' | 'Combo' | string;
  sale_price?: number;
  sales_price?: number;
  purchase_price?: number;
  cost_price?: number;
  category?: string;
  sku?: string;
  stock_quantity?: number;
  stock?: number;
  is_archived?: boolean;
}

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role === 'Contact') {
      router.push('/dashboard');
      return;
    }

    fetchProducts();
  }, [filterType]);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');

      let url = '/api/products?';
      if (filterType) url += `type=${filterType}&`;
      if (search) url += `search=${search}&`;

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const columns = [
    {
      header: 'Product Name',
      accessor: (row: Product) => row.product_name || row.name || '-',
      className: 'font-medium',
    },
    {
      header: 'SKU',
      accessor: (row: Product) => row.sku || '-',
    },
    {
      header: 'Type',
      accessor: (row: Product) => {
        const type = row.product_type || 'Goods';
        return (
          <span
            className={`inline-block px-2 py-1 text-[11px] font-semibold rounded-full ${
              type === 'Goods'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : type === 'Service'
                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            {type}
          </span>
        );
      },
    },
    {
      header: 'Category',
      accessor: (row: Product) => row.category || '-',
    },
    {
      header: 'Sales Price',
      accessor: (row: Product) => formatCurrency(parseFloat(String(row.sales_price ?? row.sale_price ?? 0)) || 0),
      className: 'text-right font-medium tabular-nums',
    },
    {
      header: 'Cost Price',
      accessor: (row: Product) => formatCurrency(parseFloat(String(row.cost_price ?? row.purchase_price ?? 0)) || 0),
      className: 'text-right tabular-nums',
    },
    {
      header: 'Stock',
      accessor: (row: Product) => {
        const type = (row.product_type || 'Goods').toLowerCase();
        if (type === 'service') return '-';
        const qty = parseFloat(String(row.stock_quantity ?? row.stock ?? 0)) || 0;
        return qty.toFixed(2);
      },
      className: 'text-right tabular-nums',
    },
  ];

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[24px] font-semibold text-[#111827]">Products</h1>
          <p className="text-[14px] text-[#667085] mt-1">
            Manage your product catalog and inventory
          </p>
        </div>
        <Button
          onClick={() => router.push('/products/new')}
          className="flex items-center gap-2"
        >
          <PlusIcon size={16} />
          <span>New Product</span>
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search by name or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && fetchProducts()}
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
              <option value="Goods">Goods</option>
              <option value="Service">Services</option>
              <option value="Combo">Combo</option>
            </select>
            <Button onClick={fetchProducts} variant="secondary">
              Search
            </Button>
          </div>
        </div>
      </div>

      <Table
        data={products}
        columns={columns}
        onRowClick={(product) => router.push(`/products/${product.id}`)}
        isLoading={isLoading}
        emptyMessage="No products found. Create your first product to get started."
      />
    </div>
  );
}
