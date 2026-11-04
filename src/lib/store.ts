// ==============================================================================
// In-Memory & LocalStorage State Store (Fallback & Interactive Demo Mode)
// Matches Postgres DB triggers, RLS policies and constraints exactly.
// ==============================================================================

import {
  Admin,
  Restaurant,
  Payment,
  RestaurantTable,
  MenuCategory,
  MenuItem,
  TableSession,
  Order,
  OrderItem,
  Bill,
  ServiceRequest,
  CurrentUser,
  OrderStatus,
} from '@/types/database';

// Initial Demo Seed Data
const INITIAL_ADMIN: Admin = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'admin@qrapi.com',
  created_at: new Date().toISOString(),
};

const getFutureDate = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const getPastDate = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
};

const INITIAL_RESTAURANTS: Restaurant[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    owner_id: '00000000-0000-0000-0000-000000000002',
    name: 'Spice Garden Bistro',
    slug: 'spice-garden',
    phone: '+91 98765 11111',
    address: '120 MG Road, Indiranagar, Bengaluru, KA 560038',
    logo_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&h=200&fit=crop',
    gst_number: '29AAAAA0000A1Z5',
    gst_percent: 5.0,
    service_charge_percent: 2.5,
    currency_symbol: '₹',
    status: 'active',
    paid_until: getFutureDate(30),
    setup_fee_paid: true,
    monthly_fee: 1000,
    setup_fee: 5000,
    max_tables: 10,
    sound_enabled: true,
    sound_volume: 1.0,
    opening_hours: '11:00 AM - 11:30 PM',
    admin_contact_phone: '+91 98765 43210',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    owner_id: '00000000-0000-0000-0000-000000000003',
    name: 'Curry House Express',
    slug: 'curry-house',
    phone: '+91 98765 22222',
    address: '45 Park Street, Kolkata, WB 700016',
    logo_url: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=200&h=200&fit=crop',
    gst_number: '19BBBBB1111B2Z4',
    gst_percent: 5.0,
    service_charge_percent: 0.0,
    currency_symbol: '₹',
    status: 'expired',
    paid_until: getPastDate(1),
    setup_fee_paid: true,
    monthly_fee: 1000,
    setup_fee: 5000,
    max_tables: 5,
    sound_enabled: true,
    sound_volume: 1.0,
    opening_hours: '12:00 PM - 10:30 PM',
    admin_contact_phone: '+91 98765 43210',
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const INITIAL_PAYMENTS: Payment[] = [
  {
    id: 'pay-1',
    restaurant_id: '11111111-1111-1111-1111-111111111111',
    restaurant_name: 'Spice Garden Bistro',
    amount: 5000,
    payment_type: 'setup',
    payment_date: getPastDate(30),
    note: 'Initial onboarding setup fee via UPI',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'pay-2',
    restaurant_id: '11111111-1111-1111-1111-111111111111',
    restaurant_name: 'Spice Garden Bistro',
    amount: 1000,
    payment_type: 'monthly',
    payment_date: getPastDate(0),
    note: 'Monthly maintenance payment',
    created_at: new Date().toISOString(),
  },
];

const INITIAL_TABLES: RestaurantTable[] = [
  {
    id: 'tbl-1',
    restaurant_id: '11111111-1111-1111-1111-111111111111',
    table_number: 1,
    table_name: 'Table 1 - Patio',
    token: 'sg_tbl_1_tok_84920412',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'tbl-2',
    restaurant_id: '11111111-1111-1111-1111-111111111111',
    table_number: 2,
    table_name: 'Table 2 - Indoor',
    token: 'sg_tbl_2_tok_93817421',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'tbl-3',
    restaurant_id: '11111111-1111-1111-1111-111111111111',
    table_number: 3,
    table_name: 'Table 3 - Window',
    token: 'sg_tbl_3_tok_74628103',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'tbl-4',
    restaurant_id: '11111111-1111-1111-1111-111111111111',
    table_number: 4,
    table_name: 'Table 4 - Family',
    token: 'sg_tbl_4_tok_51928374',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'tbl-5',
    restaurant_id: '11111111-1111-1111-1111-111111111111',
    table_number: 5,
    table_name: 'Table 5 - Terrace',
    token: 'sg_tbl_5_tok_62910482',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'tbl-ch-1',
    restaurant_id: '22222222-2222-2222-2222-222222222222',
    table_number: 1,
    table_name: 'Table 1',
    token: 'ch_tbl_1_tok_11223344',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'tbl-ch-2',
    restaurant_id: '22222222-2222-2222-2222-222222222222',
    table_number: 2,
    table_name: 'Table 2',
    token: 'ch_tbl_2_tok_55667788',
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

const INITIAL_CATEGORIES: MenuCategory[] = [
  {
    id: 'cat-1',
    restaurant_id: '11111111-1111-1111-1111-111111111111',
    name: 'Starters & Appetizers',
    sort_order: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: 'cat-2',
    restaurant_id: '11111111-1111-1111-1111-111111111111',
    name: 'Signature Main Course',
    sort_order: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: 'cat-3',
    restaurant_id: '11111111-1111-1111-1111-111111111111',
    name: 'Refreshing Beverages',
    sort_order: 3,
    created_at: new Date().toISOString(),
  },
  {
    id: 'cat-4',
    restaurant_id: '11111111-1111-1111-1111-111111111111',
    name: 'Artisan Desserts',
    sort_order: 4,
    created_at: new Date().toISOString(),
  },
];

const INITIAL_MENU_ITEMS: MenuItem[] = [
  {
    id: 'item-1',
    restaurant_id: '11111111-1111-1111-1111-111111111111',
    category_id: 'cat-1',
    name: 'Paneer Tikka Angara',
    description: 'Cottage cheese marinated in Kashmiri spices and clay-oven roasted to perfection.',
    price: 280,
    image_url: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&h=350&fit=crop',
    is_veg: true,
    is_available: true,
    sort_order: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: 'item-2',
    restaurant_id: '11111111-1111-1111-1111-111111111111',
    category_id: 'cat-1',
    name: 'Crispy Chilli Corn',
    description: 'Golden American corn tossed with peppers, scallions, and tangy wok sauce.',
    price: 220,
    image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&h=350&fit=crop',
    is_veg: true,
    is_available: true,
    sort_order: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: 'item-3',
    restaurant_id: '11111111-1111-1111-1111-111111111111',
    category_id: 'cat-2',
    name: 'Old Delhi Butter Chicken',
    description: 'Tender boneless chicken simmered in a velvety tomato and cashew butter gravy.',
    price: 390,
    image_url: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=500&h=350&fit=crop',
    is_veg: false,
    is_available: true,
    sort_order: 3,
    created_at: new Date().toISOString(),
  },
  {
    id: 'item-4',
    restaurant_id: '11111111-1111-1111-1111-111111111111',
    category_id: 'cat-2',
    name: 'Garlic Butter Naan',
    description: 'Tandoor-baked flatbread brushed with roasted garlic butter and fresh cilantro.',
    price: 65,
    image_url: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=500&h=350&fit=crop',
    is_veg: true,
    is_available: true,
    sort_order: 4,
    created_at: new Date().toISOString(),
  },
  {
    id: 'item-5',
    restaurant_id: '11111111-1111-1111-1111-111111111111',
    category_id: 'cat-3',
    name: 'Mango Kesari Lassi',
    description: 'Chilled yogurt smoothie blended with fresh Alphonso mango pulp and saffron.',
    price: 120,
    image_url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&h=350&fit=crop',
    is_veg: true,
    is_available: true,
    sort_order: 5,
    created_at: new Date().toISOString(),
  },
  {
    id: 'item-6',
    restaurant_id: '11111111-1111-1111-1111-111111111111',
    category_id: 'cat-4',
    name: 'Gulab Jamun with Rabdi',
    description: 'Warm milk-solid dumplings soaked in rose syrup, paired with slow-cooked rabdi.',
    price: 150,
    image_url: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=500&h=350&fit=crop',
    is_veg: true,
    is_available: true,
    sort_order: 6,
    created_at: new Date().toISOString(),
  },
];

const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord-101',
    restaurant_id: '11111111-1111-1111-1111-111111111111',
    table_id: 'tbl-3',
    table_number: 3,
    session_id: 'sess-demo-3',
    order_number: 101,
    order_type: 'initial',
    status: 'accepted',
    subtotal: 400,
    tax_amount: 20,
    service_charge_amount: 10,
    total_amount: 430,
    customer_notes: 'Please keep spices mild',
    rejection_reason: null,
    created_at: new Date(Date.now() - 15 * 60000).toISOString(),
    updated_at: new Date().toISOString(),
    items: [
      {
        id: 'ord-item-1',
        order_id: 'ord-101',
        restaurant_id: '11111111-1111-1111-1111-111111111111',
        menu_item_id: 'item-1',
        name: 'Paneer Tikka Angara',
        price: 280,
        quantity: 1,
        total_price: 280,
        is_veg: true,
        notes: 'Mild spice',
        status: 'accepted',
        created_at: new Date().toISOString(),
      },
      {
        id: 'ord-item-2',
        order_id: 'ord-101',
        restaurant_id: '11111111-1111-1111-1111-111111111111',
        menu_item_id: 'item-5',
        name: 'Mango Kesari Lassi',
        price: 120,
        quantity: 1,
        total_price: 120,
        is_veg: true,
        notes: 'Extra cold',
        status: 'accepted',
        created_at: new Date().toISOString(),
      },
    ],
  },
];

const INITIAL_BILLS: Bill[] = [
  {
    id: 'bill-1001',
    restaurant_id: '11111111-1111-1111-1111-111111111111',
    table_id: 'tbl-1',
    session_id: 'sess-old-1',
    bill_number: 1001,
    restaurant_name: 'Spice Garden Bistro',
    restaurant_address: '120 MG Road, Indiranagar, Bengaluru, KA 560038',
    restaurant_phone: '+91 98765 11111',
    restaurant_gst: '29AAAAA0000A1Z5',
    table_number: 1,
    subtotal: 670,
    tax_percent: 5.0,
    tax_amount: 33.5,
    service_charge_percent: 2.5,
    service_charge_amount: 16.75,
    grand_total: 720.25,
    payment_method: 'upi',
    items_json: [
      { name: 'Old Delhi Butter Chicken', price: 390, quantity: 1, total_price: 390, is_veg: false },
      { name: 'Garlic Butter Naan', price: 65, quantity: 2, total_price: 130, is_veg: true },
      { name: 'Gulab Jamun with Rabdi', price: 150, quantity: 1, total_price: 150, is_veg: true },
    ],
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
];

// Helper to access LocalStorage safely
const STORAGE_PREFIX = 'qrsaas_';

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    // Trigger window event so multiple open tabs stay in sync
    window.dispatchEvent(new Event('qrsaas_storage_update'));
  } catch (err) {
    console.error('Failed to save to storage', err);
  }
}

// In-Memory Fallback State (when running server-side or without browser storage)
const memoryStore = {
  restaurants: [...INITIAL_RESTAURANTS],
  payments: [...INITIAL_PAYMENTS],
  tables: [...INITIAL_TABLES],
  categories: [...INITIAL_CATEGORIES],
  menuItems: [...INITIAL_MENU_ITEMS],
  orders: [...INITIAL_ORDERS],
  bills: [...INITIAL_BILLS],
  serviceRequests: [] as ServiceRequest[],
  users: [
    { email: 'admin@qrapi.com', password: 'password', role: 'admin' as const, id: '00000000-0000-0000-0000-000000000001' },
    { email: 'owner@spicegarden.com', password: 'password', role: 'owner' as const, id: '00000000-0000-0000-0000-000000000002', restaurant_id: '11111111-1111-1111-1111-111111111111' },
    { email: 'owner@curryhouse.com', password: 'password', role: 'owner' as const, id: '00000000-0000-0000-0000-000000000003', restaurant_id: '22222222-2222-2222-2222-222222222222' },
  ],
};

export const Store = {
  // Reset demo store back to original seed
  resetToDemo() {
    saveToStorage('restaurants', INITIAL_RESTAURANTS);
    saveToStorage('payments', INITIAL_PAYMENTS);
    saveToStorage('tables', INITIAL_TABLES);
    saveToStorage('categories', INITIAL_CATEGORIES);
    saveToStorage('menu_items', INITIAL_MENU_ITEMS);
    saveToStorage('orders', INITIAL_ORDERS);
    saveToStorage('bills', INITIAL_BILLS);
    saveToStorage('service_requests', []);
  },

  // --------------------------------------------------------------------------
  // RESTAURANTS
  // --------------------------------------------------------------------------
  getRestaurants(): Restaurant[] {
    return loadFromStorage('restaurants', memoryStore.restaurants);
  },

  getRestaurantById(id: string): Restaurant | null {
    const list = this.getRestaurants();
    return list.find((r) => r.id === id) || null;
  },

  getRestaurantBySlug(slug: string): Restaurant | null {
    const list = this.getRestaurants();
    return list.find((r) => r.slug.toLowerCase() === slug.toLowerCase()) || null;
  },

  isLive(restaurant: Restaurant | null): boolean {
    if (!restaurant) return false;
    const today = new Date().toISOString().split('T')[0];
    return restaurant.status === 'active' && restaurant.paid_until >= today;
  },

  createRestaurant(params: {
    name: string;
    owner_email: string;
    temporary_password?: string;
    phone: string;
    setup_fee_paid: boolean;
    monthly_fee: number;
    paid_until: string;
    max_tables?: number;
  }): { restaurant: Restaurant; owner_user_id: string } {
    const slug = params.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    const newOwnerId = 'owner_' + Math.random().toString(36).substring(2, 11);
    const newRestId = 'rest_' + Math.random().toString(36).substring(2, 11);

    const newRest: Restaurant = {
      id: newRestId,
      owner_id: newOwnerId,
      name: params.name,
      slug: slug || 'restaurant-' + Math.floor(Math.random() * 1000),
      phone: params.phone,
      address: 'City Center, Main Road',
      logo_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&h=200&fit=crop',
      gst_number: '29XXXXX0000X1Z1',
      gst_percent: 5.0,
      service_charge_percent: 0.0,
      currency_symbol: '₹',
      status: 'active',
      paid_until: params.paid_until,
      setup_fee_paid: params.setup_fee_paid,
      monthly_fee: params.monthly_fee || 1000,
      setup_fee: 5000,
      max_tables: params.max_tables || 20,
      sound_enabled: true,
      sound_volume: 1.0,
      opening_hours: '10:00 AM - 11:00 PM',
      admin_contact_phone: '+91 98765 43210',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const restaurants = this.getRestaurants();
    restaurants.push(newRest);
    saveToStorage('restaurants', restaurants);
    memoryStore.restaurants = restaurants;

    // Record setup fee payment if marked paid
    if (params.setup_fee_paid) {
      this.recordPayment({
        restaurant_id: newRest.id,
        restaurant_name: newRest.name,
        amount: newRest.setup_fee,
        payment_type: 'setup',
        payment_date: new Date().toISOString().split('T')[0],
        note: 'Initial setup & registration fee paid at registration',
      });
    }

    // Create 3 default tables for the restaurant
    for (let i = 1; i <= 3; i++) {
      this.createTable(newRest.id, i, `Table ${i}`);
    }

    // Create 2 default categories
    const cat1 = this.createCategory(newRest.id, 'Chef Specials', 1);
    const cat2 = this.createCategory(newRest.id, 'Beverages', 2);

    // Create 2 sample items
    this.createMenuItem({
      restaurant_id: newRest.id,
      category_id: cat1.id,
      name: 'Signature Platter',
      description: 'Chef special assortment served fresh.',
      price: 250,
      image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&h=350&fit=crop',
      is_veg: true,
      is_available: true,
      sort_order: 1,
    });

    this.createMenuItem({
      restaurant_id: newRest.id,
      category_id: cat2.id,
      name: 'Fresh Lime Soda',
      description: 'Sweet and salted refreshing beverage.',
      price: 80,
      image_url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&h=350&fit=crop',
      is_veg: true,
      is_available: true,
      sort_order: 1,
    });

    return { restaurant: newRest, owner_user_id: newOwnerId };
  },

  // Owner settings update: anti-tamper rule enforced!
  updateRestaurantAsOwner(restaurantId: string, updates: Partial<Restaurant>): Restaurant {
    const restaurants = this.getRestaurants();
    const idx = restaurants.findIndex((r) => r.id === restaurantId);
    if (idx === -1) throw new Error('Restaurant not found');

    const current = restaurants[idx];

    // Enforce Postgres trigger: owner cannot tamper with status, paid_until, fees, or max_tables
    if (
      updates.status !== undefined ||
      updates.paid_until !== undefined ||
      updates.setup_fee_paid !== undefined ||
      updates.monthly_fee !== undefined ||
      updates.setup_fee !== undefined ||
      updates.max_tables !== undefined
    ) {
      throw new Error(
        'Database Security Constraint: Restaurant owners cannot modify subscription status, billing, or table limits.'
      );
    }

    const updated = {
      ...current,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    restaurants[idx] = updated;
    saveToStorage('restaurants', restaurants);
    memoryStore.restaurants = restaurants;
    return updated;
  },

  // Admin restaurant update (allowed to modify all fields)
  updateRestaurantAsAdmin(restaurantId: string, updates: Partial<Restaurant>): Restaurant {
    const restaurants = this.getRestaurants();
    const idx = restaurants.findIndex((r) => r.id === restaurantId);
    if (idx === -1) throw new Error('Restaurant not found');

    const updated = {
      ...restaurants[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    restaurants[idx] = updated;
    saveToStorage('restaurants', restaurants);
    memoryStore.restaurants = restaurants;
    return updated;
  },

  deleteRestaurant(restaurantId: string): void {
    const restaurants = this.getRestaurants().filter((r) => r.id !== restaurantId);
    saveToStorage('restaurants', restaurants);
    memoryStore.restaurants = restaurants;
  },

  // Mark monthly payment received: extends paid_until by 1 month from max(today, paid_until)
  markMonthlyPaymentReceived(restaurantId: string, note?: string): Restaurant {
    const rest = this.getRestaurantById(restaurantId);
    if (!rest) throw new Error('Restaurant not found');

    const today = new Date().toISOString().split('T')[0];
    const baseDate = rest.paid_until > today ? new Date(rest.paid_until) : new Date();
    // Add 1 month (30 days)
    baseDate.setDate(baseDate.getDate() + 30);
    const newPaidUntil = baseDate.toISOString().split('T')[0];

    // Update restaurant status to active if it was expired
    const updated = this.updateRestaurantAsAdmin(restaurantId, {
      paid_until: newPaidUntil,
      status: 'active',
    });

    // Record payment
    this.recordPayment({
      restaurant_id: rest.id,
      restaurant_name: rest.name,
      amount: rest.monthly_fee,
      payment_type: 'monthly',
      payment_date: today,
      note: note || `Monthly maintenance paid (valid until ${newPaidUntil})`,
    });

    return updated;
  },

  markSetupFeePaid(restaurantId: string, note?: string): Restaurant {
    const rest = this.getRestaurantById(restaurantId);
    if (!rest) throw new Error('Restaurant not found');

    const updated = this.updateRestaurantAsAdmin(restaurantId, {
      setup_fee_paid: true,
    });

    this.recordPayment({
      restaurant_id: rest.id,
      restaurant_name: rest.name,
      amount: rest.setup_fee,
      payment_type: 'setup',
      payment_date: new Date().toISOString().split('T')[0],
      note: note || 'One-time registration setup fee payment recorded by Admin',
    });

    return updated;
  },

  // --------------------------------------------------------------------------
  // PAYMENTS
  // --------------------------------------------------------------------------
  getPayments(): Payment[] {
    return loadFromStorage('payments', memoryStore.payments);
  },

  recordPayment(payment: Omit<Payment, 'id' | 'created_at'>): Payment {
    const payments = this.getPayments();
    const newPay: Payment = {
      ...payment,
      id: 'pay_' + Math.random().toString(36).substring(2, 9),
      created_at: new Date().toISOString(),
    };
    payments.unshift(newPay);
    saveToStorage('payments', payments);
    memoryStore.payments = payments;
    return newPay;
  },

  // --------------------------------------------------------------------------
  // TABLES & QR
  // --------------------------------------------------------------------------
  getTables(restaurantId: string): RestaurantTable[] {
    const all = loadFromStorage('tables', memoryStore.tables);
    return all.filter((t) => t.restaurant_id === restaurantId);
  },

  getTableByToken(token: string): RestaurantTable | null {
    const all = loadFromStorage('tables', memoryStore.tables);
    return all.find((t) => t.token === token && t.is_active) || null;
  },

  createTable(restaurantId: string, tableNumber: number, tableName?: string): RestaurantTable {
    const rest = this.getRestaurantById(restaurantId);
    if (!rest) throw new Error('Restaurant not found');

    const currentTables = this.getTables(restaurantId);
    // Enforce max tables trigger
    if (currentTables.length >= rest.max_tables) {
      throw new Error(`Maximum table limit of ${rest.max_tables} reached for this restaurant.`);
    }

    if (currentTables.some((t) => t.table_number === tableNumber)) {
      throw new Error(`Table number ${tableNumber} already exists.`);
    }

    const token = `${rest.slug}_t${tableNumber}_${Math.random().toString(36).substring(2, 10)}`;
    const newTable: RestaurantTable = {
      id: 'tbl_' + Math.random().toString(36).substring(2, 9),
      restaurant_id: restaurantId,
      table_number: tableNumber,
      table_name: tableName || `Table ${tableNumber}`,
      token,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    const all = loadFromStorage('tables', memoryStore.tables);
    all.push(newTable);
    saveToStorage('tables', all);
    memoryStore.tables = all;
    return newTable;
  },

  regenerateTableToken(tableId: string): RestaurantTable {
    const all = loadFromStorage('tables', memoryStore.tables);
    const idx = all.findIndex((t) => t.id === tableId);
    if (idx === -1) throw new Error('Table not found');

    const rest = this.getRestaurantById(all[idx].restaurant_id);
    const slug = rest ? rest.slug : 'tbl';
    const newToken = `${slug}_t${all[idx].table_number}_${Math.random().toString(36).substring(2, 12)}`;

    all[idx].token = newToken;
    saveToStorage('tables', all);
    memoryStore.tables = all;
    return all[idx];
  },

  deleteTable(tableId: string): void {
    const all = loadFromStorage('tables', memoryStore.tables).filter((t) => t.id !== tableId);
    saveToStorage('tables', all);
    memoryStore.tables = all;
  },

  // --------------------------------------------------------------------------
  // MENU CATEGORIES & ITEMS
  // --------------------------------------------------------------------------
  getCategories(restaurantId: string): MenuCategory[] {
    const all = loadFromStorage('categories', memoryStore.categories);
    return all
      .filter((c) => c.restaurant_id === restaurantId)
      .sort((a, b) => a.sort_order - b.sort_order);
  },

  createCategory(restaurantId: string, name: string, sortOrder = 0): MenuCategory {
    const all = loadFromStorage('categories', memoryStore.categories);
    const newCat: MenuCategory = {
      id: 'cat_' + Math.random().toString(36).substring(2, 9),
      restaurant_id: restaurantId,
      name,
      sort_order: sortOrder || all.length + 1,
      created_at: new Date().toISOString(),
    };
    all.push(newCat);
    saveToStorage('categories', all);
    memoryStore.categories = all;
    return newCat;
  },

  updateCategory(categoryId: string, updates: Partial<MenuCategory>): MenuCategory {
    const all = loadFromStorage('categories', memoryStore.categories);
    const idx = all.findIndex((c) => c.id === categoryId);
    if (idx === -1) throw new Error('Category not found');

    all[idx] = { ...all[idx], ...updates };
    saveToStorage('categories', all);
    memoryStore.categories = all;
    return all[idx];
  },

  deleteCategory(categoryId: string): void {
    const all = loadFromStorage('categories', memoryStore.categories).filter((c) => c.id !== categoryId);
    saveToStorage('categories', all);
    memoryStore.categories = all;
  },

  getMenuItems(restaurantId: string): MenuItem[] {
    const all = loadFromStorage('menu_items', memoryStore.menuItems);
    return all
      .filter((m) => m.restaurant_id === restaurantId)
      .sort((a, b) => a.sort_order - b.sort_order);
  },

  createMenuItem(item: Omit<MenuItem, 'id' | 'created_at'>): MenuItem {
    const all = loadFromStorage('menu_items', memoryStore.menuItems);
    const newItem: MenuItem = {
      ...item,
      id: 'item_' + Math.random().toString(36).substring(2, 9),
      created_at: new Date().toISOString(),
    };
    all.push(newItem);
    saveToStorage('menu_items', all);
    memoryStore.menuItems = all;
    return newItem;
  },

  updateMenuItem(itemId: string, updates: Partial<MenuItem>): MenuItem {
    const all = loadFromStorage('menu_items', memoryStore.menuItems);
    const idx = all.findIndex((m) => m.id === itemId);
    if (idx === -1) throw new Error('Menu item not found');

    all[idx] = { ...all[idx], ...updates };
    saveToStorage('menu_items', all);
    memoryStore.menuItems = all;
    return all[idx];
  },

  deleteMenuItem(itemId: string): void {
    const all = loadFromStorage('menu_items', memoryStore.menuItems).filter((m) => m.id !== itemId);
    saveToStorage('menu_items', all);
    memoryStore.menuItems = all;
  },

  // --------------------------------------------------------------------------
  // ORDERS & ORDER ITEMS
  // --------------------------------------------------------------------------
  getOrders(restaurantId: string): Order[] {
    const all = loadFromStorage('orders', memoryStore.orders);
    return all
      .filter((o) => o.restaurant_id === restaurantId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  // Customer Place Order with DB checks: live check, rate limiting, quantity caps
  placeOrder(params: {
    tableToken: string;
    sessionToken: string;
    items: { menuItemId: string; quantity: number; notes?: string }[];
    notes?: string;
    orderType?: 'initial' | 'addon';
    deviceFingerprint?: string;
  }): Order {
    const table = this.getTableByToken(params.tableToken);
    if (!table) throw new Error('Invalid or inactive table QR code.');

    const rest = this.getRestaurantById(table.restaurant_id);
    if (!rest) throw new Error('Restaurant not found.');

    // Enforce Live Status Check
    if (!this.isLive(rest)) {
      throw new Error('This restaurant is temporarily unavailable.');
    }

    // Rate Limiting Check: max 5 orders per 10 minutes per session
    const recentOrders = this.getOrders(rest.id).filter(
      (o) =>
        o.session_id === params.sessionToken &&
        o.table_id === table.id &&
        new Date(o.created_at).getTime() > Date.now() - 10 * 60 * 1000
    );
    if (recentOrders.length >= 5) {
      throw new Error('Order limit reached (maximum 5 orders per 10 minutes). Please wait a few minutes.');
    }

    const menuItems = this.getMenuItems(rest.id);
    let subtotal = 0;
    const orderItems: OrderItem[] = [];
    const orderId = 'ord_' + Math.random().toString(36).substring(2, 9);

    for (const itemReq of params.items) {
      const menuItem = menuItems.find((m) => m.id === itemReq.menuItemId);
      if (!menuItem || !menuItem.is_available) {
        throw new Error(`Item ${menuItem?.name || itemReq.menuItemId} is not currently available.`);
      }

      // Quantity capped at 20
      const qty = Math.min(Math.max(itemReq.quantity, 1), 20);
      const lineTotal = menuItem.price * qty;
      subtotal += lineTotal;

      orderItems.push({
        id: 'ord_item_' + Math.random().toString(36).substring(2, 9),
        order_id: orderId,
        restaurant_id: rest.id,
        menu_item_id: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: qty,
        total_price: lineTotal,
        is_veg: menuItem.is_veg,
        notes: itemReq.notes || null,
        status: 'pending',
        created_at: new Date().toISOString(),
      });
    }

    const tax = Math.round(subtotal * (rest.gst_percent / 100) * 100) / 100;
    const serviceCharge = Math.round(subtotal * (rest.service_charge_percent / 100) * 100) / 100;
    const grandTotal = subtotal + tax + serviceCharge;

    const allOrders = loadFromStorage('orders', memoryStore.orders);
    const nextOrderNumber = allOrders.filter((o) => o.restaurant_id === rest.id).length + 101;

    const newOrder: Order = {
      id: orderId,
      restaurant_id: rest.id,
      table_id: table.id,
      table_number: table.table_number,
      session_id: params.sessionToken,
      order_number: nextOrderNumber,
      order_type: params.orderType || 'initial',
      status: 'pending',
      subtotal,
      tax_amount: tax,
      service_charge_amount: serviceCharge,
      total_amount: grandTotal,
      customer_notes: params.notes || null,
      rejection_reason: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: orderItems,
    };

    allOrders.unshift(newOrder);
    saveToStorage('orders', allOrders);
    memoryStore.orders = allOrders;
    return newOrder;
  },

  updateOrderStatus(orderId: string, status: OrderStatus, rejectionReason?: string): Order {
    const all = loadFromStorage('orders', memoryStore.orders);
    const idx = all.findIndex((o) => o.id === orderId);
    if (idx === -1) throw new Error('Order not found');

    const updated = {
      ...all[idx],
      status,
      rejection_reason: rejectionReason || null,
      updated_at: new Date().toISOString(),
    };

    // If accepting, set all item statuses to accepted
    if (status === 'accepted' && updated.items) {
      updated.items = updated.items.map((i) => ({ ...i, status: 'accepted' }));
    } else if (status === 'rejected' && updated.items) {
      updated.items = updated.items.map((i) => ({ ...i, status: 'rejected' }));
    }

    all[idx] = updated;
    saveToStorage('orders', all);
    memoryStore.orders = all;
    return updated;
  },

  // Owner manual item addition to open order
  addItemToOrder(orderId: string, menuItemId: string, quantity = 1, notes = ''): Order {
    const all = loadFromStorage('orders', memoryStore.orders);
    const idx = all.findIndex((o) => o.id === orderId);
    if (idx === -1) throw new Error('Order not found');

    const order = all[idx];
    const rest = this.getRestaurantById(order.restaurant_id);
    const item = this.getMenuItems(order.restaurant_id).find((m) => m.id === menuItemId);
    if (!item) throw new Error('Item not found');

    const lineTotal = item.price * quantity;
    const newItem: OrderItem = {
      id: 'ord_item_' + Math.random().toString(36).substring(2, 9),
      order_id: order.id,
      restaurant_id: order.restaurant_id,
      menu_item_id: item.id,
      name: item.name,
      price: item.price,
      quantity,
      total_price: lineTotal,
      is_veg: item.is_veg,
      notes: notes || null,
      status: 'accepted',
      created_at: new Date().toISOString(),
    };

    const currentItems = order.items || [];
    currentItems.push(newItem);

    const subtotal = currentItems
      .filter((i) => i.status !== 'rejected')
      .reduce((sum, i) => sum + i.total_price, 0);

    const taxPercent = rest?.gst_percent || 0;
    const scPercent = rest?.service_charge_percent || 0;
    const tax = Math.round(subtotal * (taxPercent / 100) * 100) / 100;
    const sc = Math.round(subtotal * (scPercent / 100) * 100) / 100;

    order.items = currentItems;
    order.subtotal = subtotal;
    order.tax_amount = tax;
    order.service_charge_amount = sc;
    order.total_amount = subtotal + tax + sc;
    order.updated_at = new Date().toISOString();

    all[idx] = order;
    saveToStorage('orders', all);
    memoryStore.orders = all;
    return order;
  },

  // Owner edit item quantity or remove before served
  updateOrderItemQuantity(orderId: string, itemId: string, newQuantity: number): Order {
    const all = loadFromStorage('orders', memoryStore.orders);
    const idx = all.findIndex((o) => o.id === orderId);
    if (idx === -1) throw new Error('Order not found');

    const order = all[idx];
    const rest = this.getRestaurantById(order.restaurant_id);
    let items = order.items || [];

    if (newQuantity <= 0) {
      items = items.filter((i) => i.id !== itemId);
    } else {
      items = items.map((i) => {
        if (i.id === itemId) {
          return {
            ...i,
            quantity: newQuantity,
            total_price: i.price * newQuantity,
          };
        }
        return i;
      });
    }

    const subtotal = items
      .filter((i) => i.status !== 'rejected')
      .reduce((sum, i) => sum + i.total_price, 0);

    const taxPercent = rest?.gst_percent || 0;
    const scPercent = rest?.service_charge_percent || 0;
    const tax = Math.round(subtotal * (taxPercent / 100) * 100) / 100;
    const sc = Math.round(subtotal * (scPercent / 100) * 100) / 100;

    order.items = items;
    order.subtotal = subtotal;
    order.tax_amount = tax;
    order.service_charge_amount = sc;
    order.total_amount = subtotal + tax + sc;
    order.updated_at = new Date().toISOString();

    all[idx] = order;
    saveToStorage('orders', all);
    memoryStore.orders = all;
    return order;
  },

  // --------------------------------------------------------------------------
  // BILLS
  // --------------------------------------------------------------------------
  getBills(restaurantId: string): Bill[] {
    const all = loadFromStorage('bills', memoryStore.bills);
    return all
      .filter((b) => b.restaurant_id === restaurantId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  generateBill(params: {
    restaurantId: string;
    tableId: string;
    paymentMethod: 'cash' | 'upi' | 'card' | 'other';
  }): Bill {
    const rest = this.getRestaurantById(params.restaurantId);
    if (!rest) throw new Error('Restaurant not found');

    const table = this.getTables(rest.id).find((t) => t.id === params.tableId);
    if (!table) throw new Error('Table not found');

    // Find all active/accepted orders for this table
    const tableOrders = this.getOrders(rest.id).filter(
      (o) =>
        o.table_id === table.id &&
        ['accepted', 'preparing', 'ready', 'served'].includes(o.status)
    );

    if (tableOrders.length === 0) {
      throw new Error(`No open accepted orders found for Table ${table.table_number}.`);
    }

    // Merge items from all accepted orders
    const billItems: { name: string; price: number; quantity: number; total_price: number; is_veg: boolean }[] = [];
    let subtotal = 0;

    for (const ord of tableOrders) {
      for (const it of ord.items || []) {
        if (it.status !== 'rejected') {
          subtotal += it.total_price;
          billItems.push({
            name: it.name,
            price: it.price,
            quantity: it.quantity,
            total_price: it.total_price,
            is_veg: it.is_veg,
          });
        }
      }
    }

    const tax = Math.round(subtotal * (rest.gst_percent / 100) * 100) / 100;
    const sc = Math.round(subtotal * (rest.service_charge_percent / 100) * 100) / 100;
    const grandTotal = subtotal + tax + sc;

    const allBills = loadFromStorage('bills', memoryStore.bills);
    const nextBillNumber = allBills.filter((b) => b.restaurant_id === rest.id).length + 1001;

    const newBill: Bill = {
      id: 'bill_' + Math.random().toString(36).substring(2, 9),
      restaurant_id: rest.id,
      table_id: table.id,
      session_id: tableOrders[0]?.session_id || null,
      bill_number: nextBillNumber,
      restaurant_name: rest.name,
      restaurant_address: rest.address,
      restaurant_phone: rest.phone,
      restaurant_gst: rest.gst_number,
      table_number: table.table_number,
      subtotal,
      tax_percent: rest.gst_percent,
      tax_amount: tax,
      service_charge_percent: rest.service_charge_percent,
      service_charge_amount: sc,
      grand_total: grandTotal,
      payment_method: params.paymentMethod,
      items_json: billItems,
      created_at: new Date().toISOString(),
    };

    allBills.unshift(newBill);
    saveToStorage('bills', allBills);
    memoryStore.bills = allBills;

    // Mark orders as completed
    const orders = loadFromStorage('orders', memoryStore.orders);
    for (const ord of orders) {
      if (ord.table_id === table.id && ['accepted', 'preparing', 'ready', 'served'].includes(ord.status)) {
        ord.status = 'completed';
        ord.updated_at = new Date().toISOString();
      }
    }
    saveToStorage('orders', orders);
    memoryStore.orders = orders;

    // Close any pending service requests for this table
    const reqs = loadFromStorage('service_requests', memoryStore.serviceRequests);
    for (const r of reqs) {
      if (r.table_id === table.id) {
        r.status = 'completed';
      }
    }
    saveToStorage('service_requests', reqs);
    memoryStore.serviceRequests = reqs;

    return newBill;
  },

  // --------------------------------------------------------------------------
  // SERVICE REQUESTS (Call Waiter / Request Bill)
  // --------------------------------------------------------------------------
  getServiceRequests(restaurantId: string): ServiceRequest[] {
    const all = loadFromStorage('service_requests', memoryStore.serviceRequests);
    return all
      .filter((r) => r.restaurant_id === restaurantId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  callService(tableToken: string, sessionToken: string, requestType: 'call_waiter' | 'request_bill'): ServiceRequest {
    const table = this.getTableByToken(tableToken);
    if (!table) throw new Error('Invalid table QR code');

    const rest = this.getRestaurantById(table.restaurant_id);
    if (!rest || !this.isLive(rest)) throw new Error('Restaurant is currently unavailable');

    const reqs = loadFromStorage('service_requests', memoryStore.serviceRequests);
    const newReq: ServiceRequest = {
      id: 'req_' + Math.random().toString(36).substring(2, 9),
      restaurant_id: rest.id,
      table_id: table.id,
      session_id: sessionToken,
      table_number: table.table_number,
      request_type: requestType,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    reqs.unshift(newReq);
    saveToStorage('service_requests', reqs);
    memoryStore.serviceRequests = reqs;
    return newReq;
  },

  updateServiceRequestStatus(reqId: string, status: 'acknowledged' | 'completed'): void {
    const reqs = loadFromStorage('service_requests', memoryStore.serviceRequests);
    const idx = reqs.findIndex((r) => r.id === reqId);
    if (idx !== -1) {
      reqs[idx].status = status;
      saveToStorage('service_requests', reqs);
      memoryStore.serviceRequests = reqs;
    }
  },
};
