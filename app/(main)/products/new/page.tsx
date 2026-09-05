'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

export default function NewProductPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    if (!formData.product_name.trim()) newErrors.product_name = 'Product name is required';
    if (!formData.product_type) newErrors.product_type = 'Product type is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          sales_price: parseFloat(formData.sales_price) || 0,
          cost_price: parseFloat(formData.cost_price) || 0,
          stock_quantity: parseFloat(formData.stock_quantity) || 0,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/products');
      } else {
        setErrors({ general: data.message || 'Failed to create product' });
      }
    } catch (error) {
      setErrors({ general: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-[13px] text-[#2563EB] hover:text-blue-700 mb-2"
        >
          ← Back to Products
        </button>
        <h1 className="text-[24px] font-semibold text-[#111827]">New Product</h1>
        <p className="text-[14px] text-[#667085] mt-1">
          Add a new product or service to your catalog
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-[#E5E7EB] rounded-enterprise p-6">
        {errors.general && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-enterprise text-[13px] text-[#DC2626]">
            {errors.general}
          </div>
        )}

        <div className="space-y-5">
          {/* Basic Information */}
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
                options={[
                  { value: 'Goods', label: 'Goods (Physical products)' },
                  { value: 'Service', label: 'Service (Intangible)' },
                  { value: 'Combo', label: 'Combo (Goods + Service)' },
                ]}
              />
              <Input
                label="Category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                placeholder="e.g., Furniture"
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="pt-4 border-t border-[#E5E7EB]">
            <h3 className="text-[16px] font-semibold text-[#111827] mb-4">Pricing</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Sales Price"
                type="number"
                step="0.01"
                name="sales_price"
                value={formData.sales_price}
                onChange={handleChange}
                required
                placeholder="0.00"
              />
              <Input
                label="Cost Price (Purchase Price)"
                type="number"
                step="0.01"
                name="cost_price"
                value={formData.cost_price}
                onChange={handleChange}
                required
                placeholder="0.00"
              />
            </div>
            {formData.sales_price && formData.cost_price && (
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-[12px] text-blue-700">
                Margin: ₹{(parseFloat(formData.sales_price) - parseFloat(formData.cost_price)).toFixed(2)} 
                ({formData.cost_price !== '0' ? 
                  ((parseFloat(formData.sales_price) - parseFloat(formData.cost_price)) / parseFloat(formData.cost_price) * 100).toFixed(1) 
                  : '0'}%)
              </div>
            )}
          </div>

          {/* Inventory (only for Goods) */}
          {formData.product_type === 'Goods' && (
            <div className="pt-4 border-t border-[#E5E7EB]">
              <h3 className="text-[16px] font-semibold text-[#111827] mb-4">Inventory</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="SKU"
                  name="sku"
                  value={formData.sku}
                  onChange={handleChange}
                  placeholder="PROD-001"
                />
                <Input
                  label="Initial Stock"
                  type="number"
                  step="0.01"
                  name="stock_quantity"
                  value={formData.stock_quantity}
                  onChange={handleChange}
                  placeholder="0"
                />
                <Input
                  label="Unit of Measure"
                  name="unit_of_measure"
                  value={formData.unit_of_measure}
                  onChange={handleChange}
                  placeholder="Unit"
                />
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
              rows={4}
              className="w-full px-3.5 py-2.5 text-[14px] border border-[#E5E7EB] rounded-enterprise focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              placeholder="Product description..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 pt-6 border-t border-[#E5E7EB] flex gap-3">
          <Button type="submit" disabled={isSubmitting} className="flex-1 sm:flex-none">
            {isSubmitting ? 'Creating...' : 'Create Product'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.back()}
            className="flex-1 sm:flex-none"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
