'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Restaurant, Order, OrderItem, RestaurantTable, MenuItem, ServiceRequest, OrderStatus } from '@/types/database';
import { Store } from '@/lib/store';
import { SoundAlert } from '@/lib/audio-alert';
import { ScreenWakeLock } from '@/lib/wake-lock';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import {
  Bell,
  Volume2,
  VolumeX,
  Radio,
  CheckCircle2,
  XCircle,
  Clock,
  ChefHat,
  Check,
  Plus,
  Trash2,
  Receipt,
  UserCheck,
  AlertCircle,
  Coffee,
  Sparkles,
  Maximize2,
  Filter,
  Eye,
  Edit2,
} from 'lucide-react';

interface Props {
  restaurant: Restaurant;
  onOpenBillModal: (tableId: string) => void;
}

export function LiveOrders({ restaurant, onOpenBillModal }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [isTakingOrders, setIsTakingOrders] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(true);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'active' | 'served' | 'completed'>('active');
  const [tableFilter, setTableFilter] = useState<string>('all');

  // New Order / Add-on Popup Queue
  const [popupQueue, setPopupQueue] = useState<Order[]>([]);
  const [currentPopup, setCurrentPopup] = useState<Order | null>(null);
  const [rejectingOrderId, setRejectingOrderId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('Kitchen is busy right now');

  // Manual Add Item Modal
  const [addingItemToOrder, setAddingItemToOrder] = useState<Order | null>(null);
  const [selectedMenuItemId, setSelectedMenuItemId] = useState<string>('');
  const [addItemQty, setAddItemQty] = useState(1);
  const [addItemNote, setAddItemNote] = useState('');

  // Seen orders tracker to avoid repeating alarm on known orders
  const seenOrderIdsRef = useRef<Set<string>>(new Set());

  // Load latest data
  const fetchData = () => {
    try {
      const ords = Store.getOrders(restaurant.id);
      const tbls = Store.getTables(restaurant.id);
      const items = Store.getMenuItems(restaurant.id);
      const reqs = Store.getServiceRequests(restaurant.id);

      setOrders(ords);
      setTables(tbls);
      setMenuItems(items);
      setServiceRequests(reqs.filter((r) => r.status === 'pending'));

      // Check for incoming pending orders that owner hasn't acted on yet
      const pendingOrders = ords.filter((o) => o.status === 'pending');
      const newPending = pendingOrders.filter((o) => !seenOrderIdsRef.current.has(o.id));

      if (newPending.length > 0) {
        newPending.forEach((o) => seenOrderIdsRef.current.add(o.id));
        setPopupQueue((prev) => {
          const combined = [...prev];
          newPending.forEach((np) => {
            if (!combined.some((c) => c.id === np.id)) {
              combined.push(np);
            }
          });
          return combined;
        });

        // Trigger alarm if taking orders
        if (isTakingOrders && restaurant.sound_enabled) {
          SoundAlert.startAlarm(restaurant.sound_volume);
        }
      }
    } catch (err) {
      console.error('Error fetching live orders:', err);
    }
  };

  // Manage popup queue
  useEffect(() => {
    if (!currentPopup && popupQueue.length > 0) {
      const next = popupQueue[0];
      setCurrentPopup(next);
      setPopupQueue((prev) => prev.slice(1));
      if (isTakingOrders && restaurant.sound_enabled) {
        SoundAlert.startAlarm(restaurant.sound_volume);
      }
    }
  }, [popupQueue, currentPopup, isTakingOrders, restaurant]);

  // Initial load, 15-second polling backup, and reconnection listeners
  useEffect(() => {
    fetchData();

    // 15-second polling backup
    const pollInterval = setInterval(() => {
      fetchData();
    }, 15000);

    // Reconnection and window focus backup
    const handleOnline = () => {
      setIsLiveConnected(true);
      fetchData();
    };
    const handleOffline = () => {
      setIsLiveConnected(false);
    };
    const handleFocus = () => {
      fetchData();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('qrsaas_storage_update', fetchData);

    // Supabase Realtime Subscription if configured
    let channel: any = null;
    if (isSupabaseConfigured) {
      try {
        const supabase = createClient();
        channel = supabase
          .channel(`restaurant_${restaurant.id}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurant.id}` },
            () => {
              fetchData();
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'service_requests', filter: `restaurant_id=eq.${restaurant.id}` },
            () => {
              fetchData();
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              setIsLiveConnected(true);
            } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
              setIsLiveConnected(false);
            }
          });
      } catch (err) {
        console.warn('Realtime subscription not available, using polling fallback.', err);
      }
    }

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('qrsaas_storage_update', fetchData);
      if (channel) {
        channel.unsubscribe();
      }
      SoundAlert.stopAlarm();
      ScreenWakeLock.releaseLock();
    };
  }, [restaurant.id]);

  // Button to unlock audio context & wake lock
  const handleToggleTakingOrders = async () => {
    if (!isTakingOrders) {
      // Unlock audio
      await SoundAlert.unlock();
      // Test beep
      SoundAlert.playChime(restaurant.sound_volume);
      // Request Screen Wake Lock
      await ScreenWakeLock.requestLock();
      setIsTakingOrders(true);
    } else {
      SoundAlert.stopAlarm();
      ScreenWakeLock.releaseLock();
      setIsTakingOrders(false);
    }
  };

  // Accept Order or Add-on
  const handleAcceptOrder = (orderId: string) => {
    SoundAlert.stopAlarm();
    Store.updateOrderStatus(orderId, 'accepted');
    setCurrentPopup(null);
    setRejectingOrderId(null);
    fetchData();
  };

  // Reject Order with Reason
  const handleRejectOrder = (orderId: string) => {
    SoundAlert.stopAlarm();
    Store.updateOrderStatus(orderId, 'rejected', rejectReason);
    setCurrentPopup(null);
    setRejectingOrderId(null);
    fetchData();
  };

  // Order status transition
  const handleStatusChange = (orderId: string, nextStatus: OrderStatus) => {
    Store.updateOrderStatus(orderId, nextStatus);
    fetchData();
  };

  // Manual Add Item to order
  const handleAddItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingItemToOrder || !selectedMenuItemId) return;

    Store.addItemToOrder(addingItemToOrder.id, selectedMenuItemId, addItemQty, addItemNote);
    setAddingItemToOrder(null);
    setSelectedMenuItemId('');
    setAddItemQty(1);
    setAddItemNote('');
    fetchData();
  };

  // Owner update quantity or remove item before served
  const handleUpdateItemQty = (orderId: string, itemId: string, newQty: number) => {
    Store.updateOrderItemQuantity(orderId, itemId, newQty);
    fetchData();
  };

  // Acknowledge service request (call waiter / bill)
  const handleAcknowledgeService = (reqId: string) => {
    Store.updateServiceRequestStatus(reqId, 'completed');
    fetchData();
  };

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Table filter
      if (tableFilter !== 'all' && o.table_id !== tableFilter) return false;

      // Status filter
      if (statusFilter === 'pending' && o.status !== 'pending') return false;
      if (statusFilter === 'active' && !['accepted', 'preparing', 'ready'].includes(o.status)) return false;
      if (statusFilter === 'served' && o.status !== 'served') return false;
      if (statusFilter === 'completed' && !['completed', 'rejected', 'cancelled'].includes(o.status)) return false;

      return true;
    });
  }, [orders, statusFilter, tableFilter]);

  // Group active orders by table for table view cards
  const activeTableCards = useMemo(() => {
    const tableMap = new Map<string, { table: RestaurantTable; orders: Order[]; totalAmount: number }>();

    orders.forEach((ord) => {
      if (['accepted', 'preparing', 'ready', 'served'].includes(ord.status)) {
        const tbl = tables.find((t) => t.id === ord.table_id) || {
          id: ord.table_id,
          restaurant_id: restaurant.id,
          table_number: ord.table_number || 1,
          table_name: `Table ${ord.table_number || 1}`,
          token: '',
          is_active: true,
          created_at: '',
        };

        if (!tableMap.has(tbl.id)) {
          tableMap.set(tbl.id, { table: tbl, orders: [], totalAmount: 0 });
        }

        const entry = tableMap.get(tbl.id)!;
        entry.orders.push(ord);
        entry.totalAmount += Number(ord.total_amount);
      }
    });

    return Array.from(tableMap.values());
  }, [orders, tables, restaurant]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Taking Orders Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleTakingOrders}
            className={`px-5 py-2.5 rounded-2xl font-extrabold text-sm flex items-center gap-2.5 transition shadow-md ${
              isTakingOrders
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 animate-pulse'
                : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/10'
            }`}
          >
            <Radio className={`w-4 h-4 ${isTakingOrders ? 'animate-ping' : ''}`} />
            <span>{isTakingOrders ? 'Taking Orders (Sound Active)' : 'Start Taking Orders'}</span>
          </button>

          <div className="text-xs text-slate-500 hidden sm:block">
            {isTakingOrders ? 'Audio alerts unlocked • Screen kept awake' : 'Click to enable loud incoming order alerts'}
          </div>
        </div>

        {/* Right: Live Connection & Sound Indicator */}
        <div className="flex items-center gap-3 self-end md:self-auto text-xs font-semibold">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700">
            <span
              className={`w-2 h-2 rounded-full ${
                isLiveConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span>{isLiveConnected ? 'Realtime Live' : 'Reconnecting...'}</span>
          </div>

          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${
              restaurant.sound_enabled ? 'bg-orange-50 text-orange-700' : 'bg-slate-100 text-slate-500'
            }`}
          >
            {restaurant.sound_enabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>Vol {Math.round(restaurant.sound_volume * 100)}%</span>
          </div>
        </div>
      </div>

      {/* Pending Waiter / Bill Alert Bar */}
      {serviceRequests.length > 0 && (
        <div className="bg-amber-500 text-slate-950 p-4 rounded-2xl shadow-lg border border-amber-400 space-y-2 animate-bounce">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Bell className="w-4 h-4" />
            <span>Pending Table Requests ({serviceRequests.length})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {serviceRequests.map((req) => (
              <div
                key={req.id}
                className="bg-white/95 backdrop-blur-sm p-3 rounded-xl flex items-center justify-between text-xs font-semibold shadow-sm"
              >
                <div>
                  <div className="font-extrabold text-slate-900">Table {req.table_number}</div>
                  <div className="text-amber-800 uppercase tracking-wider text-[10px]">
                    {req.request_type === 'call_waiter' ? '🛎️ Calling Waiter' : '🧾 Requesting Final Bill'}
                  </div>
                </div>
                <button
                  onClick={() => handleAcknowledgeService(req.id)}
                  className="px-3 py-1 bg-slate-900 text-white rounded-lg text-xs hover:bg-slate-800 transition font-bold"
                >
                  Clear
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and View Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {(
            [
              { id: 'active', label: 'Active Kitchen (Prep)' },
              { id: 'pending', label: 'Waiting Accept' },
              { id: 'served', label: 'Served' },
              { id: 'completed', label: 'Completed / Bills' },
              { id: 'all', label: 'All Orders' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setStatusFilter(t.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                statusFilter === t.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              {t.label}
              {t.id === 'pending' && orders.some((o) => o.status === 'pending') && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500 text-white">
                  {orders.filter((o) => o.status === 'pending').length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Table Selector */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={tableFilter}
            onChange={(e) => setTableFilter(e.target.value)}
            className="text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          >
            <option value="all">All Tables</option>
            {tables.map((tbl) => (
              <option key={tbl.id} value={tbl.id}>
                {tbl.table_name || `Table ${tbl.table_number}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Orders Grid */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-sm">
          <ChefHat className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No orders found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Orders placed by customers via table QR codes will appear here in real-time with loud sound alerts.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((ord) => {
            const table = tables.find((t) => t.id === ord.table_id);
            const isAddon = ord.order_type === 'addon';

            return (
              <div
                key={ord.id}
                className={`bg-white rounded-3xl border p-5 shadow-sm transition flex flex-col justify-between ${
                  ord.status === 'pending'
                    ? 'border-orange-500 ring-2 ring-orange-500/20'
                    : 'border-slate-200/80 hover:border-slate-300'
                }`}
              >
                {/* Order Header */}
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-extrabold text-slate-900">
                          {table?.table_name || `Table ${ord.table_number}`}
                        </span>
                        {isAddon && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                            Add-on
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Order #{ord.order_number} • {new Date(ord.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    {/* Status Pill */}
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider ${
                        ord.status === 'pending'
                          ? 'bg-amber-100 text-amber-800 animate-pulse'
                          : ord.status === 'accepted'
                          ? 'bg-blue-100 text-blue-800'
                          : ord.status === 'preparing'
                          ? 'bg-orange-100 text-orange-800'
                          : ord.status === 'ready'
                          ? 'bg-emerald-100 text-emerald-800'
                          : ord.status === 'served'
                          ? 'bg-purple-100 text-purple-800'
                          : ord.status === 'completed'
                          ? 'bg-slate-100 text-slate-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {ord.status}
                    </span>
                  </div>

                  {/* Customer Notes */}
                  {ord.customer_notes && (
                    <div className="mb-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                      <strong className="block text-[10px] uppercase tracking-wider text-amber-700">
                        Kitchen Note:
                      </strong>
                      {ord.customer_notes}
                    </div>
                  )}

                  {/* Item List */}
                  <div className="space-y-2 mb-4">
                    {ord.items?.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-xs group">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                              item.is_veg ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                          <span className="font-semibold text-slate-800">
                            {item.quantity}x {item.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-700">₹{item.total_price}</span>

                          {/* Editable quantity / removal before served */}
                          {['accepted', 'preparing'].includes(ord.status) && (
                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition">
                              <button
                                onClick={() => handleUpdateItemQty(ord.id, item.id, item.quantity - 1)}
                                className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold"
                              >
                                -
                              </button>
                              <button
                                onClick={() => handleUpdateItemQty(ord.id, item.id, item.quantity + 1)}
                                className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold"
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer with Totals & Progress Action Buttons */}
                <div className="border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between text-xs mb-3">
                    <span className="text-slate-500">
                      Subtotal: ₹{ord.subtotal} {ord.tax_amount > 0 ? `+ GST` : ''}
                    </span>
                    <span className="font-black text-slate-900 text-sm">₹{ord.total_amount}</span>
                  </div>

                  {/* Actions based on state */}
                  {ord.status === 'pending' ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleAcceptOrder(ord.id)}
                        className="py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => {
                          setRejectingOrderId(ord.id);
                          setCurrentPopup(ord);
                        }}
                        className="py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition"
                      >
                        Reject
                      </button>
                    </div>
                  ) : ord.status === 'accepted' ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleStatusChange(ord.id, 'preparing')}
                        className="flex-1 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                      >
                        Mark Preparing
                      </button>
                      <button
                        onClick={() => setAddingItemToOrder(ord)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs transition"
                        title="Add item manually"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ) : ord.status === 'preparing' ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleStatusChange(ord.id, 'ready')}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                      >
                        Food Ready
                      </button>
                      <button
                        onClick={() => setAddingItemToOrder(ord)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs transition"
                        title="Add item manually"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ) : ord.status === 'ready' ? (
                    <button
                      onClick={() => handleStatusChange(ord.id, 'served')}
                      className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                    >
                      Mark Served to Table
                    </button>
                  ) : ord.status === 'served' ? (
                    <button
                      onClick={() => onOpenBillModal(ord.table_id)}
                      className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Generate Bill & Settle</span>
                    </button>
                  ) : (
                    <div className="text-center text-[11px] text-slate-400 font-medium py-1">
                      {ord.status === 'completed'
                        ? 'Billed & Completed'
                        : `Rejected: ${ord.rejection_reason || 'Unavailable'}`}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FULL SCREEN POPUP MODAL: New Order or Add-on Alert */}
      {currentPopup && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border-4 border-orange-500 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center font-black text-xl animate-pulse">
                  🔔
                </div>
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-100 text-orange-800">
                    {currentPopup.order_type === 'addon' ? 'Table Add-On Order' : 'New Table Order'}
                  </span>
                  <h2 className="text-2xl font-black text-slate-900 mt-0.5">
                    Table {currentPopup.table_number || 1}
                  </h2>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-slate-400">Order #{currentPopup.order_number}</div>
                <div className="text-xl font-black text-slate-900">₹{currentPopup.total_amount}</div>
              </div>
            </div>

            {/* Reject Form or Item Review */}
            {rejectingOrderId === currentPopup.id ? (
              <div className="mt-5 space-y-4">
                <div className="text-xs font-bold text-rose-600 uppercase tracking-wider">
                  Reason for Rejecting Order:
                </div>
                <div className="space-y-2">
                  {[
                    'One or more items are out of stock',
                    'Kitchen is experiencing high rush / delay',
                    'Restaurant closing soon',
                    'Invalid or duplicate walk-in scan',
                  ].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRejectReason(r)}
                      className={`w-full text-left p-3 rounded-xl border text-xs font-semibold transition ${
                        rejectReason === r
                          ? 'border-rose-500 bg-rose-50 text-rose-800'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    onClick={() => setRejectingOrderId(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleRejectOrder(currentPopup.id)}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md"
                  >
                    Confirm Rejection
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {currentPopup.customer_notes && (
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
                    <strong className="block text-[10px] uppercase font-bold text-amber-700">Customer Note:</strong>
                    {currentPopup.customer_notes}
                  </div>
                )}

                <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1 divide-y divide-slate-100">
                  {currentPopup.items?.map((it) => (
                    <div key={it.id} className="pt-2 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                            it.is_veg ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                        <span className="font-bold text-slate-800">
                          {it.quantity}x {it.name}
                        </span>
                      </div>
                      <span className="font-extrabold text-slate-900">₹{it.total_price}</span>
                    </div>
                  ))}
                </div>

                {/* Accept / Reject Big Buttons */}
                <div className="grid grid-cols-2 gap-4 pt-5 border-t border-slate-100">
                  <button
                    onClick={() => setRejectingOrderId(currentPopup.id)}
                    className="py-3.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 rounded-2xl text-sm font-bold transition flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-5 h-5" />
                    <span>Reject</span>
                  </button>

                  <button
                    onClick={() => handleAcceptOrder(currentPopup.id)}
                    className="py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-sm font-black transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>ACCEPT ORDER</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual Add Item Modal */}
      {addingItemToOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">
              Add Item to Table {addingItemToOrder.table_number}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Walk-in order addition</p>

            <form onSubmit={handleAddItemSubmit} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Menu Item</label>
                <select
                  required
                  value={selectedMenuItemId}
                  onChange={(e) => setSelectedMenuItemId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="">-- Choose Item --</option>
                  {menuItems
                    .filter((m) => m.is_available)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} (₹{item.price})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Quantity</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={addItemQty}
                  onChange={(e) => setAddItemQty(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kitchen Note (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Extra spicy"
                  value={addItemNote}
                  onChange={(e) => setAddItemNote(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setAddingItemToOrder(null)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-orange-600 text-white font-bold rounded-lg shadow-sm"
                >
                  Add to Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
