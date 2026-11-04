// ==============================================================================
// Database & Domain Types for Multi-Restaurant QR Ordering SaaS
// ==============================================================================

export type RestaurantStatus = 'active' | 'suspended' | 'expired';

export interface Admin {
  id: string;
  email: string;
  created_at: string;
}

export interface Restaurant {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  gst_number: string | null;
  gst_percent: number;
  service_charge_percent: number;
  currency_symbol: string;
  status: RestaurantStatus;
  paid_until: string; // ISO date YYYY-MM-DD
  setup_fee_paid: boolean;
  monthly_fee: number;
  setup_fee: number;
  max_tables: number;
  sound_enabled: boolean;
  sound_volume: number;
  opening_hours: string;
  admin_contact_phone: string;
  created_at: string;
  updated_at: string;
}

export type PaymentType = 'setup' | 'monthly' | 'other';

export interface Payment {
  id: string;
  restaurant_id: string;
  amount: number;
  payment_type: PaymentType;
  payment_date: string;
  note: string | null;
  recorded_by?: string | null;
  created_at: string;
  restaurant_name?: string;
}

export interface RestaurantTable {
  id: string;
  restaurant_id: string;
  table_number: number;
  table_name: string;
  token: string;
  is_active: boolean;
  created_at: string;
}

export interface MenuCategory {
  id: string;
  restaurant_id: string;
  name: string;
  sort_order: number;
  created_at: string;
  items?: MenuItem[];
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_veg: boolean;
  is_available: boolean;
  sort_order: number;
  created_at: string;
}

export interface TableSession {
  id: string;
  restaurant_id: string;
  table_id: string;
  session_token: string;
  status: 'active' | 'completed' | 'cancelled';
  device_fingerprint?: string | null;
  order_count: number;
  started_at: string;
  closed_at?: string | null;
}

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'served'
  | 'completed'
  | 'rejected'
  | 'cancelled';

export type OrderType = 'initial' | 'addon';

export interface Order {
  id: string;
  restaurant_id: string;
  table_id: string;
  session_id: string;
  order_number: number;
  order_type: OrderType;
  status: OrderStatus;
  subtotal: number;
  tax_amount: number;
  service_charge_amount: number;
  total_amount: number;
  customer_notes: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  table_number?: number;
  items?: OrderItem[];
}

export type OrderItemStatus = 'pending' | 'accepted' | 'rejected' | 'served';

export interface OrderItem {
  id: string;
  order_id: string;
  restaurant_id: string;
  menu_item_id: string | null;
  name: string;
  price: number;
  quantity: number;
  total_price: number;
  is_veg: boolean;
  notes: string | null;
  status: OrderItemStatus;
  created_at: string;
}

export type PaymentMethod = 'cash' | 'upi' | 'card' | 'other';

export interface BillItemSnapshot {
  id?: string;
  name: string;
  price: number;
  quantity: number;
  total_price: number;
  is_veg: boolean;
}

export interface Bill {
  id: string;
  restaurant_id: string;
  table_id: string;
  session_id: string | null;
  bill_number: number;
  restaurant_name: string;
  restaurant_address: string | null;
  restaurant_phone: string | null;
  restaurant_gst: string | null;
  table_number: number;
  subtotal: number;
  tax_percent: number;
  tax_amount: number;
  service_charge_percent: number;
  service_charge_amount: number;
  grand_total: number;
  payment_method: PaymentMethod;
  items_json: BillItemSnapshot[];
  created_at: string;
}

export type ServiceRequestType = 'call_waiter' | 'request_bill';
export type ServiceRequestStatus = 'pending' | 'acknowledged' | 'completed';

export interface ServiceRequest {
  id: string;
  restaurant_id: string;
  table_id: string;
  session_id: string;
  table_number: number;
  request_type: ServiceRequestType;
  status: ServiceRequestStatus;
  created_at: string;
}

// User context returned from Auth
export interface CurrentUser {
  id: string;
  email: string;
  role: 'admin' | 'owner' | 'guest';
  restaurant?: Restaurant | null;
}
