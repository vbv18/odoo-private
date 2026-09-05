export interface StoredContact {
  id: string;
  name: string;
  contact_type: 'Customer' | 'Vendor' | 'Both';
  email: string;
  mobile?: string;
  city?: string;
  state?: string;
  address?: string;
  is_archived: boolean;
}

export interface StoredProduct {
  id: string;
  product_name: string;
  product_type: 'Goods' | 'Service' | 'Combo';
  sales_price: number;
  cost_price: number;
  category?: string;
  sku?: string;
  unit_of_measure?: string;
  is_archived: boolean;
}

export const FALLBACK_CONTACTS: StoredContact[] = [
  { id: 'c1', name: 'Acme Corp', contact_type: 'Customer', email: 'billing@acme.com', mobile: '+91 98765 43210', city: 'Mumbai', state: 'Maharashtra', is_archived: false },
  { id: 'c2', name: 'TechFlow Solutions', contact_type: 'Customer', email: 'accounts@techflow.io', mobile: '+91 98765 11223', city: 'Bengaluru', state: 'Karnataka', is_archived: false },
  { id: 'c3', name: 'Nexus Dynamics', contact_type: 'Customer', email: 'nexus@example.com', mobile: '+91 98765 33445', city: 'Delhi', state: 'Delhi', is_archived: false },
  { id: 'c4', name: 'Global Wood Supplies', contact_type: 'Vendor', email: 'supply@globalwood.com', mobile: '+91 98765 55667', city: 'Pune', state: 'Maharashtra', is_archived: false },
  { id: 'c5', name: 'Apex Logistics & Services', contact_type: 'Both', email: 'service@apexlog.com', mobile: '+91 98765 99887', city: 'Hyderabad', state: 'Telangana', is_archived: false },
];

export const FALLBACK_PRODUCTS: StoredProduct[] = [
  { id: 'p1', product_name: 'Executive Ergonomic Chair', product_type: 'Goods', sales_price: 12500, cost_price: 7500, category: 'Seating', sku: 'CHR-EXEC-01', unit_of_measure: 'Unit', is_archived: false },
  { id: 'p2', product_name: 'Oak Wood Conference Table', product_type: 'Goods', sales_price: 52000, cost_price: 32000, category: 'Desks & Tables', sku: 'TBL-CONF-01', unit_of_measure: 'Unit', is_archived: false },
  { id: 'p3', product_name: 'Modular Storage Cabinet', product_type: 'Goods', sales_price: 18000, cost_price: 11000, category: 'Storage', sku: 'CAB-MOD-01', unit_of_measure: 'Unit', is_archived: false },
  { id: 'p4', product_name: 'Office Furniture Assembly', product_type: 'Service', sales_price: 3500, cost_price: 1500, category: 'Installation Services', sku: 'SRV-ASSM-01', unit_of_measure: 'Hour', is_archived: false },
  { id: 'p5', product_name: 'Annual Maintenance Contract', product_type: 'Service', sales_price: 25000, cost_price: 10000, category: 'Maintenance', sku: 'SRV-AMC-01', unit_of_measure: 'Year', is_archived: false },
];
