'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Restaurant, RestaurantTable, MenuCategory, MenuItem, Order, OrderItem } from '@/types/database';
import { Store } from '@/lib/store';
import confetti from 'canvas-confetti';
import {
  Search,
  ShoppingBag,
  Plus,
  Minus,
  Sparkles,
  Clock,
  ChefHat,
  CheckCircle2,
  XCircle,
  Bell,
  Receipt,
  RotateCcw,
  AlertCircle,
  ArrowRight,
  X,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

interface Props {
  slug: string;
  tableToken: string;
}

export function CustomerMenuPage({ slug, tableToken }: Props) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [table, setTable] = useState<RestaurantTable | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotLive, setIsNotLive] = useState(false);
  const [invalidToken, setInvalidToken] = useState(false);

  // Filters
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [vegOnly, setVegOnly] = useState(false);

  // Cart: item ID -> quantity
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartNotes, setCartNotes] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Active view: 'menu' or 'tracker'
  const [viewMode, setViewMode] = useState<'menu' | 'tracker'>('menu');

  // Customer session token
  const [sessionToken, setSessionToken] = useState<string>('');
  const [serviceFeedback, setServiceFeedback] = useState<string | null>(null);

  // Initialize table session from localStorage
  useEffect(() => {
    let sess = localStorage.getItem(`qrsaas_session_${tableToken}`);
    if (!sess) {
      sess = 'sess_' + Math.random().toString(36).substring(2, 12);
      localStorage.setItem(`qrsaas_session_${tableToken}`, sess);
    }
    setSessionToken(sess);
  }, [tableToken]);

  // Load menu data
  const loadData = () => {
    const rest = Store.getRestaurantBySlug(slug);
    const tbl = Store.getTableByToken(tableToken);

    if (!rest || !tbl || tbl.restaurant_id !== rest.id) {
      setInvalidToken(true);
      setIsLoading(false);
      return;
    }

    setRestaurant(rest);
    setTable(tbl);

    // Database check: Is restaurant currently live?
    const live = Store.isLive(rest);
    if (!live) {
      setIsNotLive(true);
      setIsLoading(false);
      return;
    }

    setCategories(Store.getCategories(rest.id));
    setMenuItems(Store.getMenuItems(rest.id));

    // Load customer session's orders for this table
    const sess = localStorage.getItem(`qrsaas_session_${tableToken}`);
    if (sess) {
      const allOrders = Store.getOrders(rest.id);
      const sessionOrders = allOrders.filter(
        (o) => o.session_id === sess && o.table_id === tbl.id
      );

      // Check if all orders were completed (table marked paid) -> auto-reset table session
      const hasCompletedOrders = sessionOrders.some((o) => o.status === 'completed');
      const hasActiveOrders = sessionOrders.some((o) =>
        ['pending', 'accepted', 'preparing', 'ready', 'served'].includes(o.status)
      );

      if (hasCompletedOrders && !hasActiveOrders) {
        // Table session closed by owner! Next customer scan gets fresh session
        const newSess = 'sess_' + Math.random().toString(36).substring(2, 12);
        localStorage.setItem(`qrsaas_session_${tableToken}`, newSess);
        setSessionToken(newSess);
        setOrders([]);
        setViewMode('menu');
      } else {
        setOrders(sessionOrders);
        if (sessionOrders.length > 0 && viewMode !== 'menu') {
          setViewMode('tracker');
        }
      }
    }

    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
    // Realtime polling backup for order tracker updates
    const interval = setInterval(loadData, 4000);
    window.addEventListener('qrsaas_storage_update', loadData);
    return () => {
      clearInterval(interval);
      window.removeEventListener('qrsaas_storage_update', loadData);
    };
  }, [slug, tableToken]);

  // Cart operations
  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prev) => {
      const current = prev[itemId] || 0;
      const next = current + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return { ...prev, [itemId]: Math.min(next, 20) };
    });
  };

  const cartItems = useMemo(() => {
    return Object.entries(cart)
      .map(([id, qty]) => {
        const item = menuItems.find((m) => m.id === id);
        return item ? { item, quantity: qty, total: item.price * qty } : null;
      })
      .filter(Boolean) as { item: MenuItem; quantity: number; total: number }[];
  }, [cart, menuItems]);

  const cartSubtotal = useMemo(() => {
    return cartItems.reduce((sum, i) => sum + i.total, 0);
  }, [cartItems]);

  const cartTax = restaurant
    ? Math.round(cartSubtotal * (restaurant.gst_percent / 100) * 100) / 100
    : 0;
  const cartServiceCharge = restaurant
    ? Math.round(cartSubtotal * (restaurant.service_charge_percent / 100) * 100) / 100
    : 0;
  const cartGrandTotal = cartSubtotal + cartTax + cartServiceCharge;
  const totalCartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  // Running accepted bill for open table session
  const runningSessionBill = useMemo(() => {
    let subtotal = 0;
    const items: OrderItem[] = [];

    orders.forEach((ord) => {
      if (['accepted', 'preparing', 'ready', 'served'].includes(ord.status)) {
        ord.items?.forEach((it) => {
          if (it.status !== 'rejected') {
            subtotal += it.total_price;
            items.push(it);
          }
        });
      }
    });

    const tax = restaurant ? Math.round(subtotal * (restaurant.gst_percent / 100) * 100) / 100 : 0;
    const sc = restaurant ? Math.round(subtotal * (restaurant.service_charge_percent / 100) * 100) / 100 : 0;
    const total = subtotal + tax + sc;

    return { subtotal, tax, sc, total, items };
  }, [orders, restaurant]);

  // Place Order (Initial or Add-on)
  const handlePlaceOrder = async () => {
    if (cartItems.length === 0 || isSubmittingOrder) return;
    setIsSubmittingOrder(true);

    const hasExistingOrders = orders.length > 0;
    const orderType = hasExistingOrders ? 'addon' : 'initial';

    try {
      const payload = {
        tableToken,
        sessionToken,
        items: cartItems.map((ci) => ({
          menuItemId: ci.item.id,
          quantity: ci.quantity,
        })),
        notes: cartNotes,
        orderType,
      };

      const res = await fetch('/api/customer/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Trigger confetti celebration
      try {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.8 } });
      } catch {}

      setCart({});
      setCartNotes('');
      setIsCartOpen(false);
      setViewMode('tracker');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Could not place order');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Call Waiter / Request Bill
  const handleCallService = async (type: 'call_waiter' | 'request_bill') => {
    try {
      const res = await fetch('/api/customer/service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableToken,
          sessionToken,
          requestType: type,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setServiceFeedback(
        type === 'call_waiter'
          ? '🛎️ Server notified! A waiter is coming to your table.'
          : '🧾 Bill requested! The staff will bring your receipt shortly.'
      );
      setTimeout(() => setServiceFeedback(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Service request failed');
    }
  };

  // Filtered menu dishes
  const filteredDishes = useMemo(() => {
    return menuItems.filter((m) => {
      if (activeCategory !== 'all' && m.category_id !== activeCategory) return false;
      if (vegOnly && !m.is_veg) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          m.name.toLowerCase().includes(q) ||
          (m.description && m.description.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [menuItems, activeCategory, vegOnly, searchQuery]);

  // Loading Screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <div className="mt-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
          Loading Table Menu...
        </div>
      </div>
    );
  }

  // Invalid Token Screen
  if (invalidToken || !restaurant || !table) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-lg border border-slate-200">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-xl font-black text-slate-900">Invalid Table QR</h2>
          <p className="text-xs text-slate-500 mt-2">
            This table code could not be verified. Please ask your server for assistance.
          </p>
        </div>
      </div>
    );
  }

  // Not Live Screen (Database rule enforcement: blocked or expired)
  if (isNotLive) {
    return (
      <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-xl border border-slate-200">
          <div className="w-16 h-16 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center mx-auto mb-4">
            <ChefHat className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900">{restaurant.name}</h2>
          <div className="mt-3 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 inline-block">
            Temporarily Unavailable
          </div>
          <p className="text-slate-600 text-xs mt-3 leading-relaxed">
            This restaurant is temporarily unavailable for QR ordering. Please order directly with your waiter.
          </p>
          {restaurant.phone && (
            <div className="mt-5 text-xs text-slate-400">
              Front Desk: <span className="font-bold text-slate-700">{restaurant.phone}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Most recent order for active tracker
  const latestOrder = orders[0];

  return (
    <div className="min-h-screen bg-[#faf8f5] text-slate-900 pb-28 max-w-md mx-auto shadow-2xl relative">
      {/* Toast Service Feedback */}
      {serviceFeedback && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl text-xs font-bold text-center animate-bounce">
          {serviceFeedback}
        </div>
      )}

      {/* TOP APP HEADER */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {restaurant.logo_url ? (
              <img
                src={restaurant.logo_url}
                alt={restaurant.name}
                className="w-9 h-9 rounded-full object-cover border border-slate-200"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-black text-sm">
                🍽️
              </div>
            )}
            <div>
              <h1 className="text-sm font-black text-slate-900 truncate max-w-[170px]">
                {restaurant.name}
              </h1>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold">
                <span className="text-orange-600 font-extrabold">{table.table_name || `Table ${table.table_number}`}</span>
                <span>•</span>
                <span className="text-emerald-600">Open Menu</span>
              </div>
            </div>
          </div>

          {/* Call Waiter & Bill buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleCallService('call_waiter')}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold flex items-center gap-1 transition"
              title="Call Server"
            >
              <Bell className="w-3 h-3 text-orange-600" />
              <span>Waiter</span>
            </button>

            {orders.length > 0 && (
              <button
                onClick={() => handleCallService('request_bill')}
                className="px-2.5 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 text-[11px] font-bold flex items-center gap-1 transition"
                title="Request Final Bill"
              >
                <Receipt className="w-3 h-3 text-orange-600" />
                <span>Bill</span>
              </button>
            )}
          </div>
        </div>

        {/* View Switcher if orders exist */}
        {orders.length > 0 && (
          <div className="mt-2.5 grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setViewMode('menu')}
              className={`py-1.5 rounded-lg transition ${
                viewMode === 'menu' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              Menu Catalog
            </button>
            <button
              onClick={() => setViewMode('tracker')}
              className={`py-1.5 rounded-lg transition flex items-center justify-center gap-1 ${
                viewMode === 'tracker' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-500'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>Order Status ({orders.length})</span>
            </button>
          </div>
        )}
      </header>

      {/* VIEW: LIVE ORDER TRACKER */}
      {viewMode === 'tracker' && latestOrder ? (
        <div className="p-4 space-y-5 animate-in fade-in duration-150">
          {/* Status Tracker Card */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {latestOrder.order_type === 'addon' ? 'Add-on Order' : 'Order'} #{latestOrder.order_number}
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  {latestOrder.status === 'pending'
                    ? 'Waiting for Restaurant...'
                    : latestOrder.status === 'accepted'
                    ? 'Order Accepted!'
                    : latestOrder.status === 'preparing'
                    ? 'Kitchen is Preparing'
                    : latestOrder.status === 'ready'
                    ? 'Food is Ready!'
                    : latestOrder.status === 'served'
                    ? 'Served to Table'
                    : latestOrder.status === 'rejected'
                    ? 'Order Declined'
                    : 'Order Completed'}
                </h3>
              </div>
              <span className="text-xs font-extrabold text-orange-600">
                ₹{latestOrder.total_amount}
              </span>
            </div>

            {/* Stepper Progress */}
            {latestOrder.status !== 'rejected' ? (
              <div className="mt-5 space-y-3">
                {[
                  { id: 'pending', label: 'Waiting Acceptance', icon: Clock },
                  { id: 'accepted', label: 'Accepted by Kitchen', icon: CheckCircle2 },
                  { id: 'preparing', label: 'Preparing Food', icon: ChefHat },
                  { id: 'ready', label: 'Ready to Serve', icon: Sparkles },
                  { id: 'served', label: 'Served to Table', icon: CheckCircle2 },
                ].map((step, idx) => {
                  const stepOrder = ['pending', 'accepted', 'preparing', 'ready', 'served'];
                  const currentIndex = stepOrder.indexOf(latestOrder.status);
                  const thisIndex = stepOrder.indexOf(step.id);
                  const isDone = thisIndex <= currentIndex;
                  const isCurrent = thisIndex === currentIndex;

                  const Icon = step.icon;

                  return (
                    <div key={step.id} className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition ${
                          isDone
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-400'
                        } ${isCurrent ? 'ring-4 ring-emerald-100 animate-pulse' : ''}`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span
                        className={`text-xs ${
                          isDone ? 'font-bold text-slate-900' : 'font-medium text-slate-400'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900">
                <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider text-rose-700">
                  <XCircle className="w-4 h-4" />
                  <span>Declined by Kitchen</span>
                </div>
                <p className="text-xs mt-1.5">
                  Reason: <strong>{latestOrder.rejection_reason || 'Kitchen unavailable'}</strong>
                </p>
                <button
                  onClick={() => setViewMode('menu')}
                  className="mt-3 w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition"
                >
                  Order Different Items
                </button>
              </div>
            )}
          </div>

          {/* Running Session Bill Card (Combines all accepted items) */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                Running Table Bill ({table.table_name || `Table ${table.table_number}`})
              </h4>
              <span className="text-xs font-black text-slate-900">
                ₹{runningSessionBill.total.toFixed(2)}
              </span>
            </div>

            <div className="space-y-2 text-xs divide-y divide-slate-100">
              {runningSessionBill.items.map((it, idx) => (
                <div key={idx} className="pt-2 flex justify-between items-center">
                  <span className="font-semibold text-slate-800">
                    {it.quantity}x {it.name}
                  </span>
                  <span className="font-bold text-slate-900">₹{it.total_price}</span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 text-xs space-y-1">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal:</span>
                <span>₹{runningSessionBill.subtotal.toFixed(2)}</span>
              </div>
              {runningSessionBill.tax > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>GST ({restaurant.gst_percent}%):</span>
                  <span>₹{runningSessionBill.tax.toFixed(2)}</span>
                </div>
              )}
              {runningSessionBill.sc > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>Service Charge ({restaurant.service_charge_percent}%):</span>
                  <span>₹{runningSessionBill.sc.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-sm text-slate-900 pt-1">
                <span>Grand Total:</span>
                <span>₹{runningSessionBill.total.toFixed(2)}</span>
              </div>
            </div>

            {/* "Order More Items" button */}
            <button
              onClick={() => setViewMode('menu')}
              className="mt-4 w-full py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl text-xs font-black transition shadow-md shadow-orange-500/20 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Order More Items (Add-on)</span>
            </button>
          </div>
        </div>
      ) : (
        /* VIEW: MENU CATALOG */
        <div>
          {/* Sticky Category Tabs & Search Bar */}
          <div className="sticky top-[57px] z-20 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-2.5 space-y-2">
            {/* Search and Veg Toggle */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search dishes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-100 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              {/* Veg Only Toggle */}
              <button
                onClick={() => setVegOnly(!vegOnly)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border ${
                  vegOnly
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                <span>Veg Only</span>
              </button>
            </div>

            {/* Category horizontal scrolling bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <button
                onClick={() => setActiveCategory('all')}
                className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  activeCategory === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All
              </button>

              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                    activeCategory === cat.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Dishes List */}
          <div className="p-4 space-y-3">
            {filteredDishes.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No matching dishes found.
              </div>
            ) : (
              filteredDishes.map((dish) => {
                const qty = cart[dish.id] || 0;
                const isSoldOut = !dish.is_available;

                return (
                  <div
                    key={dish.id}
                    className={`bg-white rounded-3xl p-3.5 border border-slate-200/80 shadow-sm flex items-center justify-between gap-3 transition ${
                      isSoldOut ? 'opacity-50 grayscale' : ''
                    }`}
                  >
                    {/* Details */}
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                            dish.is_veg ? 'bg-emerald-600' : 'bg-rose-600'
                          }`}
                        />
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          {dish.is_veg ? 'Veg' : 'Non-Veg'}
                        </span>
                      </div>

                      <h3 className="text-sm font-extrabold text-slate-900 leading-tight">
                        {dish.name}
                      </h3>
                      {dish.description && (
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                          {dish.description}
                        </p>
                      )}

                      <div className="text-sm font-black text-slate-900 mt-2">
                        ₹{dish.price}
                      </div>
                    </div>

                    {/* Image & Add Button */}
                    <div className="relative flex-shrink-0 flex flex-col items-center">
                      <div className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-100 relative">
                        {dish.image_url ? (
                          <img
                            src={dish.image_url}
                            alt={dish.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            🍽️
                          </div>
                        )}
                        {isSoldOut && (
                          <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
                            <span className="text-[10px] font-black uppercase text-white bg-rose-600 px-2 py-0.5 rounded-full">
                              Sold Out
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Add Button Overlay */}
                      {!isSoldOut && (
                        <div className="absolute -bottom-2 bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
                          {qty > 0 ? (
                            <div className="flex items-center text-xs font-bold text-slate-900">
                              <button
                                onClick={() => updateQuantity(dish.id, -1)}
                                className="px-2.5 py-1 hover:bg-slate-100 text-slate-700"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="px-1 text-orange-600">{qty}</span>
                              <button
                                onClick={() => updateQuantity(dish.id, 1)}
                                className="px-2.5 py-1 hover:bg-slate-100 text-slate-700"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => updateQuantity(dish.id, 1)}
                              className="px-4 py-1 text-xs font-black text-orange-600 hover:bg-orange-50 uppercase tracking-wider"
                            >
                              + ADD
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* FLOATING CART BAR AT BOTTOM */}
      {totalCartCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto z-30 animate-in slide-in-from-bottom duration-150">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-slate-900 text-white p-3.5 rounded-3xl shadow-2xl flex items-center justify-between border border-slate-700 font-bold hover:bg-slate-800 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-600 text-white flex items-center justify-center text-xs font-black">
                {totalCartCount}
              </div>
              <div className="text-left">
                <div className="text-xs text-slate-400">View Selected Items</div>
                <div className="text-sm font-black text-white">₹{cartGrandTotal.toFixed(2)}</div>
              </div>
            </div>

            <div className="flex items-center gap-1 text-orange-400 text-xs font-black">
              <span>View Cart</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* CART DRAWER / SHEET */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end justify-center">
          <div className="bg-white rounded-t-3xl max-w-md w-full p-6 shadow-2xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">Your Table Cart</h3>
                <div className="text-[11px] text-slate-500 font-medium">
                  {table.table_name || `Table ${table.table_number}`} • {orders.length > 0 ? 'Add-on Order' : 'Initial Order'}
                </div>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="divide-y divide-slate-100 my-4 space-y-2">
              {cartItems.map(({ item, quantity, total }) => (
                <div key={item.id} className="pt-2 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-extrabold text-slate-900">{item.name}</div>
                    <div className="text-slate-400 text-[10px]">₹{item.price} each</div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 font-bold">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="px-2 py-1 text-slate-600 hover:bg-slate-200"
                      >
                        -
                      </button>
                      <span className="px-1 text-orange-600">{quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="px-2 py-1 text-slate-600 hover:bg-slate-200"
                      >
                        +
                      </button>
                    </div>

                    <span className="font-black text-slate-900 text-sm min-w-[50px] text-right">
                      ₹{total}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Special Instructions Note */}
            <div className="mb-4">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Special Kitchen Note (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Less spicy, extra sauce, allergy info..."
                value={cartNotes}
                onChange={(e) => setCartNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20"
              />
            </div>

            {/* Bill Breakdown */}
            <div className="bg-slate-50 rounded-2xl p-4 space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{cartSubtotal.toFixed(2)}</span>
              </div>
              {cartTax > 0 && (
                <div className="flex justify-between">
                  <span>GST ({restaurant.gst_percent}%):</span>
                  <span>₹{cartTax.toFixed(2)}</span>
                </div>
              )}
              {cartServiceCharge > 0 && (
                <div className="flex justify-between">
                  <span>Service Charge ({restaurant.service_charge_percent}%):</span>
                  <span>₹{cartServiceCharge.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-slate-200 pt-2 flex justify-between font-black text-sm text-slate-900">
                <span>Total Amount:</span>
                <span>₹{cartGrandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Big Place Order Button */}
            <button
              onClick={handlePlaceOrder}
              disabled={isSubmittingOrder || cartItems.length === 0}
              className="mt-5 w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl text-sm font-black transition shadow-lg shadow-orange-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span>{isSubmittingOrder ? 'Sending to Kitchen...' : 'PLACE ORDER NOW'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
