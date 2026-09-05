'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

interface Product {
  id: string;
  product_name: string;
  product_type: 'Goods' | 'Service' | 'Combo';
  sales_price: number;
  cost_price: number;
  category: string;
  description: string;
  sku: string;
  stock_quantity: number;
  unit_of_measure: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [userRole, setUserRole] = useState('');
  const [formData, setFormData] = useState({
    product_name: '',
    product_type: '',
    sales_price: '',
    cost_price: '',
    category: '',
    description: '',
    sku: '',
    stock_quantity: '',
    unit_of_measure: 'Unit',
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setUserRole(user.role);
    fetchProduct(token);
  }, [id]);

  const fetchProduct = async (token?: string) => {
    try {
      setIsLoading(true);
      const t = token || localStorage.getItem('token');
      const res = await fetch(`/api/products/${id}`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProduct(data.product);
        setFormData({
          product_name: data.product.product_name || '',
          product_type: data.product.product_type || '',
          sales_price: String(data.product.sales_price || ''),
          cost_price: String(data.product.cost_price || ''),
          category: data.product.category || '',
          description: data.product.description || '',
          sku: data.product.sku || '',
          stock_quantity: String(data.product.stock_quantity || ''),
          unit_of_measure: data.product.unit_of_measure || 'Unit',
        });
      } else if (res.status === 404) {
        router.push('/products');
      }
    } catch (err) {
      console.error('Error fetching product:', err);
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
    if (!formData.product_name.trim()) newErrors.product_name = 'Product name is required';
    if (!formData.product_type) newErrors.product_type = 'Product type is required';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...formData,
          sales_price: parseFloat(formData.sales_price) || 0,
          cost_price: parseFloat(formData.cost_price) || 0,
          stock_quantity: parseFloat(formData.stock_quantity) || 0,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setProduct(data.product);
        setIsEditing(false);
        setErrors({});
      } else {
        setErrors({ general: data.message || 'Failed to update product' });
      }
    } catch {
      setErrors({ general: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = async () => {
    if (!window.confirm('Archive this product? It will no longer appear in active lists.')) return;
    setIsArchiving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        router.push('/products');
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to archive product');
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
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!product) return null;

  const margin = product.sales_price && product.cost_price
    ? ((product.sales_price - product.cost_price) / (product.cost_price || 1) * 100).toFixed(1)
    : null;

  return (
    <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/products')}
          className="text-[13px] text-[#2563EB] hover:text-blue-700 mb-2"
        >
          ← Back to Products
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-semibold text-[#111827]">{product.product_name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded-full ${
                product.product_type === 'Goods' ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : product.product_type === 'Service' ? 'bg-purple-50 text-purple-700 border border-purple-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                {product.product_type}
              </span>
              {product.is_archived && (
                <span className="inline-block px-2 py-0.5 text-[11px] font-semibold rounded-full bg-gray-100 text-gray-600">
                  Archived
                </span>
              )}
              {product.sku && (
                <span className="text-[12px] text-[#667085] font-mono">SKU: {product.sku}</span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {!isEditing && !product.is_archived && (
              <Button onClick={() => setIsEditing(true)} variant="secondary">Edit</Button>
            )}
            {userRole === 'Admin' && !product.is_archived && (
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

      {/* Price Summary Banner */}
      {!isEditing && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-4">
            <p className="text-[12px] text-[#667085]">Sales Price</p>
            <p className="text-[20px] font-semibold text-[#111827]">{formatCurrency(product.sales_price)}</p>
          </div>
          <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-4">
            <p className="text-[12px] text-[#667085]">Cost Price</p>
            <p className="text-[20px] font-semibold text-[#111827]">{formatCurrency(product.cost_price)}</p>
          </div>
          <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-4">
            <p className="text-[12px] text-[#667085]">Margin</p>
            <p className="text-[20px] font-semibold text-[#16A34A]">{margin ? `${margin}%` : '—'}</p>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white border border-[#E5E7EB] rounded-enterprise p-6 space-y-5">
        {errors.general && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-enterprise text-[13px] text-[#DC2626]">
            {errors.general}
          </div>
        )}

        {/* Basic Info */}
        <div>
          <h3 className="text-[16px] font-semibold text-[#111827] mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Input
                label="Product Name"
                name="product_name"
                value={formData.product_name}
                onChange={handleChange}
                error={errors.product_name}
                required
                disabled={!isEditing}
                placeholder="e.g., Office Chair"
              />
            </div>
            <Select
              label="Product Type"
              name="product_type"
              value={formData.product_type}
              onChange={handleChange}
              error={errors.product_type}
              required
              disabled={!isEditing}
              options={[
                { value: 'Goods', label: 'Goods (Physical products)' },
                { value: 'Service', label: 'Service (Intangible)' },
                { value: 'Combo', label: 'Combo (Goods + Service)' },
              ]}
            />
            <Input label="Category" name="category" value={formData.category} onChange={handleChange} disabled={!isEditing} placeholder="e.g., Furniture" />
          </div>
        </div>

        {/* Pricing */}
        <div className="pt-4 border-t border-[#E5E7EB]">
          <h3 className="text-[16px] font-semibold text-[#111827] mb-4">Pricing</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Sales Price (₹)" type="number" step="0.01" name="sales_price" value={formData.sales_price} onChange={handleChange} disabled={!isEditing} placeholder="0.00" />
            <Input label="Cost Price (₹)" type="number" step="0.01" name="cost_price" value={formData.cost_price} onChange={handleChange} disabled={!isEditing} placeholder="0.00" />
          </div>
          {isEditing && formData.sales_price && formData.cost_price && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-[12px] text-blue-700">
              Margin: ₹{(parseFloat(formData.sales_price) - parseFloat(formData.cost_price)).toFixed(2)}{' '}
              ({parseFloat(formData.cost_price) !== 0
                ? ((parseFloat(formData.sales_price) - parseFloat(formData.cost_price)) / parseFloat(formData.cost_price) * 100).toFixed(1)
                : '0'}%)
            </div>
          )}
        </div>

        {/* Inventory (Goods only) */}
        {(formData.product_type === 'Goods' || product.product_type === 'Goods') && (
          <div className="pt-4 border-t border-[#E5E7EB]">
            <h3 className="text-[16px] font-semibold text-[#111827] mb-4">Inventory</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input label="SKU" name="sku" value={formData.sku} onChange={handleChange} disabled={!isEditing} placeholder="PROD-001" />
              <Input label="Stock Quantity" type="number" step="0.01" name="stock_quantity" value={formData.stock_quantity} onChange={handleChange} disabled={!isEditing} placeholder="0" />
              <Input label="Unit of Measure" name="unit_of_measure" value={formData.unit_of_measure} onChange={handleChange} disabled={!isEditing} placeholder="Unit" />
            </div>
          </div>
        )}

        {/* Description */}
        <div className="pt-4 border-t border-[#E5E7EB]">
          <h3 className="text-[16px] font-semibold text-[#111827] mb-4">Description</h3>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            disabled={!isEditing}
            className="w-full px-3.5 py-2.5 text-[14px] border border-[#E5E7EB] rounded-enterprise focus:outline-none focus:ring-2 focus:ring-[#2563EB] disabled:bg-[#F7F8FA] disabled:text-[#667085]"
            placeholder="Product description..."
          />
        </div>

        {/* Metadata */}
        <div className="pt-4 border-t border-[#E5E7EB] grid grid-cols-2 gap-4">
          <div>
            <p className="text-[12px] text-[#667085]">Created</p>
            <p className="text-[13px] text-[#111827] font-medium">
              {new Date(product.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div>
            <p className="text-[12px] text-[#667085]">Last Updated</p>
            <p className="text-[13px] text-[#111827] font-medium">
              {new Date(product.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
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
                if (product) {
                  setFormData({
                    product_name: product.product_name || '',
                    product_type: product.product_type || '',
                    sales_price: String(product.sales_price || ''),
                    cost_price: String(product.cost_price || ''),
                    category: product.category || '',
                    description: product.description || '',
                    sku: product.sku || '',
                    stock_quantity: String(product.stock_quantity || ''),
                    unit_of_measure: product.unit_of_measure || 'Unit',
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
