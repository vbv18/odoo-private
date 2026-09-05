'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { TrashIcon, PlusIcon } from '@/components/icons';

interface Contact {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name?: string;
  product_name?: string;
  cost_price?: number;
  purchase_price?: number;
  unit_of_measure?: string;
}

interface LineItem {
  product_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Contact[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    vendor_id: '',
    po_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: '',
    notes: '',
  });

  const [items, setItems] = useState<LineItem[]>([
    { product_id: '', description: '', quantity: 1, unit_price: 0, tax_rate: 18 },
  ]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchVendorsAndProducts(token);
  }, [router]);

  const fetchVendorsAndProducts = async (token: string) => {
    try {
      const [vRes, pRes] = await Promise.all([
        fetch('/api/contacts', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/products', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (vRes.ok) {
        const vData = await vRes.json();
        setVendors(
          (vData.contacts || []).filter((c: any) => c.contact_type === 'Vendor' || c.contact_type === 'Both')
        );
      }
      if (pRes.ok) {
        const pData = await pRes.json();
        setProducts(pData.products || []);
      }
    } catch (err) {
      console.error('Error fetching master data:', err);
    }
  };

  const handleProductChange = (index: number, productId: string) => {
    const selected = products.find((p) => p.id === productId);
    setItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        product_id: productId,
        description: selected ? (selected.product_name || selected.name || '') : '',
        unit_price: selected ? (parseFloat(String(selected.cost_price ?? selected.purchase_price ?? 0)) || 0) : 0,
      };
      return next;
    });
  };

  const handleItemChange = (index: number, field: keyof LineItem, val: any) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { product_id: '', description: '', quantity: 1, unit_price: 0, tax_rate: 18 },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const taxAmount = items.reduce(
    (sum, item) => sum + (item.quantity * item.unit_price * item.tax_rate) / 100,
    0
  );
  const totalAmount = subtotal + taxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vendor_id) {
      setErrors({ vendor_id: 'Please select a vendor' });
      return;
    }
    if (items.some((i) => i.quantity <= 0 || i.unit_price <= 0)) {
      setErrors({ general: 'All line items must have positive quantity and unit price' });
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          items,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/purchases/orders/${data.order.id}`);
      } else {
        setErrors({ general: data.message || 'Failed to create purchase order' });
      }
    } catch {
      setErrors({ general: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <button
          onClick={() => router.push('/purchases/orders')}
          className="text-[13px] text-[#2563EB] hover:text-blue-700 mb-2 flex items-center gap-1 font-medium"
        >
          ← Back to Purchase Orders
        </button>
        <h1 className="text-[24px] font-semibold text-[#111827]">New Purchase Order</h1>
        <p className="text-[14px] text-[#667085] mt-1">Issue a formal purchase order to a vendor</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.general && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-enterprise text-[13px] text-[#DC2626]">
            {errors.general}
          </div>
        )}

        {/* PO Header Information */}
        <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-6 grid grid-cols-1 md:grid-cols-3 gap-4 shadow-xs">
          <Select
            label="Vendor"
            required
            value={formData.vendor_id}
            onChange={(e) => setFormData((prev) => ({ ...prev, vendor_id: e.target.value }))}
            error={errors.vendor_id}
            options={[
              { value: '', label: 'Select Vendor...' },
              ...vendors.map((v) => ({ value: v.id, label: v.name })),
            ]}
          />

          <Input
            label="Order Date"
            type="date"
            required
            value={formData.po_date}
            onChange={(e) => setFormData((prev) => ({ ...prev, po_date: e.target.value }))}
          />

          <Input
            label="Expected Delivery Date"
            type="date"
            value={formData.expected_delivery_date}
            onChange={(e) => setFormData((prev) => ({ ...prev, expected_delivery_date: e.target.value }))}
          />
        </div>

        {/* Line Items Table */}
        <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[16px] font-semibold text-[#111827]">Order Line Items</h2>
            <Button type="button" variant="secondary" onClick={addItem} className="flex items-center gap-1.5 text-[12px]">
              <PlusIcon size={14} />
              <span>Add Item</span>
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F7F8FA] text-[11px] font-semibold text-[#667085] uppercase tracking-wide">
                  <th className="text-left py-2 px-3 w-[30%]">Product</th>
                  <th className="text-left py-2 px-3 w-[25%]">Description</th>
                  <th className="text-right py-2 px-3 w-[12%]">Qty</th>
                  <th className="text-right py-2 px-3 w-[15%]">Unit Price (₹)</th>
                  <th className="text-right py-2 px-3 w-[10%]">GST %</th>
                  <th className="text-right py-2 px-3 w-[8%]"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className="border-b border-[#F3F4F6]">
                    <td className="py-2.5 px-3">
                      <select
                        value={item.product_id}
                        onChange={(e) => handleProductChange(idx, e.target.value)}
                        className="w-full px-2.5 py-1.5 text-[13px] border border-[#E5E7EB] rounded-enterprise focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                      >
                        <option value="">Select product...</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.product_name || p.name || 'Product'}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={item.description || ''}
                        onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                        placeholder="Item details..."
                        className="w-full px-2.5 py-1.5 text-[13px] border border-[#E5E7EB] rounded-enterprise focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity ?? 1}
                        onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full px-2.5 py-1.5 text-[13px] border border-[#E5E7EB] rounded-enterprise text-right focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price ?? 0}
                        onChange={(e) => handleItemChange(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                        className="w-full px-2.5 py-1.5 text-[13px] border border-[#E5E7EB] rounded-enterprise text-right focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={item.tax_rate}
                        onChange={(e) => handleItemChange(idx, 'tax_rate', parseFloat(e.target.value) || 0)}
                        className="w-full px-2.5 py-1.5 text-[13px] border border-[#E5E7EB] rounded-enterprise text-right focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="p-1.5 text-[#667085] hover:text-red-600 transition-colors"
                        >
                          <TrashIcon size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Subtotal and Tax Summary */}
          <div className="mt-6 flex justify-end">
            <div className="w-72 space-y-2 text-[13px]">
              <div className="flex justify-between text-[#667085]">
                <span>Subtotal:</span>
                <span className="font-mono text-[#111827]">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-[#667085]">
                <span>Tax (GST):</span>
                <span className="font-mono text-[#111827]">{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#E5E7EB] text-[15px] font-semibold text-[#111827]">
                <span>Total Amount:</span>
                <span className="font-mono text-[#2563EB]">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white border border-[#E5E7EB] rounded-enterprise p-6 shadow-xs">
          <label className="block text-[13px] font-medium text-[#111827] mb-1.5">
            Internal Notes / Instructions
          </label>
          <textarea
            rows={2}
            value={formData.notes}
            onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Special delivery instructions or vendor terms..."
            className="w-full px-3.5 py-2 text-[13px] border border-[#E5E7EB] rounded-enterprise focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Purchase Order'}
          </Button>
        </div>
      </form>
    </div>
  );
}
