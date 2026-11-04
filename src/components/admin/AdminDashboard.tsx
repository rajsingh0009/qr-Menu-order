'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Restaurant, Payment } from '@/types/database';
import { Store } from '@/lib/store';
import {
  Building2,
  CheckCircle2,
  Clock,
  AlertOctagon,
  IndianRupee,
  Plus,
  Search,
  Filter,
  RefreshCw,
  MoreVertical,
  KeyRound,
  Trash2,
  PauseCircle,
  PlayCircle,
  Download,
  Calendar,
  Phone,
  Mail,
  ShieldCheck,
  Check,
  X,
  CreditCard,
  Edit,
} from 'lucide-react';

export function AdminDashboard() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filterTab, setFilterTab] = useState<'all' | 'paid' | 'due' | 'expired' | 'suspended'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState<Restaurant | null>(null);
  const [isResetPassOpen, setIsResetPassOpen] = useState<Restaurant | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [todayStr, setTodayStr] = useState<string>('2026-11-01');

  // Form states for creating restaurant
  const [formData, setFormData] = useState({
    name: '',
    owner_email: '',
    temporary_password: '',
    phone: '',
    setup_fee_paid: true,
    monthly_fee: 1000,
    paid_until: '',
    max_tables: 20,
  });

  const [editFormData, setEditFormData] = useState({
    monthly_fee: 1000,
    max_tables: 20,
  });

  const [resetPassValue, setResetPassValue] = useState('');

  const loadData = () => {
    setRestaurants(Store.getRestaurants());
    setPayments(Store.getPayments());
  };

  useEffect(() => {
    const now = new Date();
    const isoDate = now.toISOString().split('T')[0];
    setTodayStr(isoDate);

    const future = new Date(now.getTime() + 30 * 86400000);
    setFormData((prev) => ({
      ...prev,
      paid_until: future.toISOString().split('T')[0],
    }));

    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('qrsaas_storage_update', handleUpdate);
    return () => window.removeEventListener('qrsaas_storage_update', handleUpdate);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Metrics calculation
  const getDaysLeft = (paidUntilStr: string) => {
    if (!paidUntilStr) return 0;
    const diffTime = new Date(paidUntilStr).getTime() - new Date(todayStr).getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const metrics = useMemo(() => {
    const todayDate = new Date(todayStr);
    const total = restaurants.length;
    let activeAndPaid = 0;
    let dueSoon = 0;
    let expiredOrBlocked = 0;

    restaurants.forEach((r) => {
      const days = getDaysLeft(r.paid_until);
      const isLive = r.status === 'active' && days >= 0;

      if (isLive) {
        activeAndPaid++;
        if (days <= 5) {
          dueSoon++;
        }
      } else {
        expiredOrBlocked++;
      }
    });

    // Total revenue this month
    const currentMonth = todayDate.getMonth();
    const currentYear = todayDate.getFullYear();
    const monthlyRev = payments.reduce((sum, p) => {
      const pDate = new Date(p.payment_date);
      if (pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear) {
        return sum + Number(p.amount);
      }
      return sum;
    }, 0);

    return { total, activeAndPaid, dueSoon, expiredOrBlocked, monthlyRev };
  }, [restaurants, payments]);

  // Filtered restaurants
  const filteredRestaurants = useMemo(() => {
    return restaurants.filter((r) => {
      const days = getDaysLeft(r.paid_until);
      const isLive = r.status === 'active' && days >= 0;

      // Filter by tab
      if (filterTab === 'paid' && !isLive) return false;
      if (filterTab === 'due' && !(isLive && days <= 5)) return false;
      if (filterTab === 'expired' && (isLive || r.status === 'suspended')) return false;
      if (filterTab === 'suspended' && r.status !== 'suspended') return false;

      // Filter by search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = r.name.toLowerCase().includes(q);
        const matchPhone = r.phone?.toLowerCase().includes(q);
        const matchSlug = r.slug.toLowerCase().includes(q);
        return matchName || matchPhone || matchSlug;
      }

      return true;
    });
  }, [restaurants, filterTab, searchQuery]);

  // Actions
  const handleMarkMonthlyPayment = async (r: Restaurant) => {
    try {
      const res = await fetch('/api/admin/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_monthly_payment',
          restaurant_id: r.id,
          payload: { note: `Monthly fee ₹${r.monthly_fee} collected via UPI` },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      loadData();
      showToast(`Monthly payment recorded! Paid until extended for ${r.name}`);
    } catch (err: any) {
      alert(err.message || 'Payment recording failed');
    }
  };

  const handleMarkSetupFeePaid = async (r: Restaurant) => {
    try {
      const res = await fetch('/api/admin/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_setup_fee_paid',
          restaurant_id: r.id,
          payload: { note: 'Setup registration fee of ₹5,000 received' },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      loadData();
      showToast(`Setup fee marked as paid for ${r.name}`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleSuspend = async (r: Restaurant) => {
    const isSuspended = r.status === 'suspended';
    const action = isSuspended ? 'reactivate' : 'suspend';
    if (!confirm(`${isSuspended ? 'Reactivate' : 'Suspend'} access for ${r.name}?`)) return;

    try {
      const res = await fetch('/api/admin/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, restaurant_id: r.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      loadData();
      showToast(`${r.name} has been ${isSuspended ? 'reactivated' : 'suspended'}`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteRestaurant = async (r: Restaurant) => {
    if (!confirm(`Are you sure you want to permanently delete "${r.name}" and all its data? This cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch('/api/admin/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', restaurant_id: r.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      loadData();
      showToast(`Restaurant ${r.name} deleted.`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveEditFees = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditOpen) return;
    try {
      const res = await fetch('/api/admin/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'edit_fees',
          restaurant_id: isEditOpen.id,
          payload: editFormData,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      loadData();
      setIsEditOpen(null);
      showToast(`Updated fee & table limits for ${isEditOpen.name}`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isResetPassOpen) return;
    try {
      const res = await fetch('/api/admin/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset_password',
          restaurant_id: isResetPassOpen.id,
          payload: { password: resetPassValue },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setIsResetPassOpen(null);
      showToast(`Password reset for ${isResetPassOpen.name}. New password: ${data.new_password}`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/create-restaurant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      loadData();
      setIsCreateOpen(false);
      showToast(`Restaurant "${data.restaurant.name}" created successfully! Login: ${data.credentials.email}`);
    } catch (err: any) {
      alert(err.message || 'Creation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Run scheduled expiration check simulator
  const handleTriggerDailyCron = () => {
    const updated = Store.getRestaurants().map((r) => {
      const days = getDaysLeft(r.paid_until);
      if (r.status === 'active' && days < 0) {
        return { ...r, status: 'expired' as const };
      }
      return r;
    });
    localStorage.setItem('qrsaas_restaurants', JSON.stringify(updated));
    loadData();
    showToast('Daily cron routine executed: Expired subscriptions marked automatically.');
  };

  // Export payments to CSV
  const handleExportPaymentsCSV = () => {
    const headers = 'ID,Restaurant,Amount,Type,Date,Note\n';
    const rows = payments
      .map(
        (p) =>
          `"${p.id}","${p.restaurant_name || p.restaurant_id}","${p.amount}","${p.payment_type}","${p.payment_date}","${p.note || ''}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `saas-payments-${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-20">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span className="font-medium text-sm">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-100 text-orange-800">
              Super Admin Control
            </span>
            <span className="text-xs text-slate-500">Live DB RLS Protected</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            Restaurant Accounts & Billing
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage restaurant onboarding, manual UPI/cash billing, and subscription lifecycle.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleTriggerDailyCron}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition shadow-sm"
            title="Simulate pg_cron daily job that expires unpaid accounts"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Run Daily Expiry Check</span>
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-xl transition shadow-md shadow-orange-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Create Restaurant</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total</span>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">{metrics.total}</div>
          <div className="text-xs text-slate-500 mt-1">Onboarded venues</div>
        </div>

        {/* Active & Paid */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Active & Paid</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600">{metrics.activeAndPaid}</div>
          <div className="text-xs text-slate-500 mt-1">Live customer QR ordering</div>
        </div>

        {/* Due within 5 days */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Due in 5 Days</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-600">{metrics.dueSoon}</div>
          <div className="text-xs text-slate-500 mt-1">Yellow alert in dashboard</div>
        </div>

        {/* Expired / Blocked */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-rose-600 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Blocked / Expired</span>
            <AlertOctagon className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-600">{metrics.expiredOrBlocked}</div>
          <div className="text-xs text-slate-500 mt-1">QR menus blocked</div>
        </div>

        {/* Total Revenue Month */}
        <div className="bg-gradient-to-br from-orange-500 to-amber-600 text-white p-4 sm:p-5 rounded-2xl shadow-md col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-orange-100 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Monthly Revenue</span>
            <IndianRupee className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold">₹{metrics.monthlyRev.toLocaleString()}</div>
          <div className="text-xs text-orange-100/90 mt-1">Collected this month</div>
        </div>
      </div>

      {/* Main Table Section */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Table Controls */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0">
            {(
              [
                { id: 'all', label: 'All Accounts' },
                { id: 'paid', label: 'Active & Paid' },
                { id: 'due', label: 'Due Soon (≤5d)' },
                { id: 'expired', label: 'Expired' },
                { id: 'suspended', label: 'Suspended' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  filterTab === tab.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by restaurant, slug, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Restaurant</th>
                <th className="px-5 py-3.5">Contact / Phone</th>
                <th className="px-5 py-3.5">Setup Fee</th>
                <th className="px-5 py-3.5">Monthly Fee</th>
                <th className="px-5 py-3.5">Paid Until / Days</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredRestaurants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 text-sm">
                    No restaurants found matching the selected filter.
                  </td>
                </tr>
              ) : (
                filteredRestaurants.map((r) => {
                  const days = getDaysLeft(r.paid_until);
                  const isLive = r.status === 'active' && days >= 0;

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition">
                      {/* Name & Slug */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900 text-sm">{r.name}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span>Slug: /{r.slug}</span>
                          <span>•</span>
                          <span>Limit: {r.max_tables} tables</span>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 font-medium text-slate-800">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{r.phone || 'N/A'}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>owner@{r.slug}.com</span>
                        </div>
                      </td>

                      {/* Setup Fee */}
                      <td className="px-5 py-4">
                        {r.setup_fee_paid ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold text-[11px]">
                            <Check className="w-3 h-3" /> Paid (₹{r.setup_fee})
                          </span>
                        ) : (
                          <button
                            onClick={() => handleMarkSetupFeePaid(r)}
                            className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-full font-semibold text-[11px] transition"
                            title="Click to mark setup fee received"
                          >
                            Mark Paid (₹{r.setup_fee})
                          </button>
                        )}
                      </td>

                      {/* Monthly Fee */}
                      <td className="px-5 py-4 font-semibold text-slate-800">
                        ₹{r.monthly_fee.toLocaleString()} / mo
                      </td>

                      {/* Paid Until & Days */}
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900">{r.paid_until}</div>
                        <div className="text-[11px] mt-0.5">
                          {days < 0 ? (
                            <span className="text-rose-600 font-semibold">Expired {Math.abs(days)}d ago</span>
                          ) : days <= 5 ? (
                            <span className="text-amber-600 font-semibold">{days} days remaining</span>
                          ) : (
                            <span className="text-emerald-600 font-medium">{days} days remaining</span>
                          )}
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="px-5 py-4">
                        {r.status === 'suspended' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                            Suspended
                          </span>
                        ) : isLive ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            Active & Live
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                            Blocked (Expired)
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Mark monthly payment */}
                          <button
                            onClick={() => handleMarkMonthlyPayment(r)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition"
                            title="Collect Monthly Fee (Extends +30 days)"
                          >
                            +30d Paid
                          </button>

                          {/* Quick Edit */}
                          <button
                            onClick={() => {
                              setIsEditOpen(r);
                              setEditFormData({ monthly_fee: r.monthly_fee, max_tables: r.max_tables });
                            }}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                            title="Edit Fees & Table Limit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Reset Password */}
                          <button
                            onClick={() => {
                              setIsResetPassOpen(r);
                              setResetPassValue('Owner@' + Math.floor(1000 + Math.random() * 9000));
                            }}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                            title="Reset Owner Password"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          {/* Suspend / Reactivate */}
                          <button
                            onClick={() => handleToggleSuspend(r)}
                            className={`p-1.5 rounded-lg transition ${
                              r.status === 'suspended'
                                ? 'text-emerald-600 hover:bg-emerald-50'
                                : 'text-amber-600 hover:bg-amber-50'
                            }`}
                            title={r.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                          >
                            {r.status === 'suspended' ? (
                              <PlayCircle className="w-3.5 h-3.5" />
                            ) : (
                              <PauseCircle className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteRestaurant(r)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                            title="Delete Restaurant"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment History Section */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Payment Collection Log</h2>
            <p className="text-xs text-slate-500">Record of all setup fees and monthly subscription renewals</p>
          </div>

          <button
            onClick={handleExportPaymentsCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition self-start"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Restaurant</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{p.payment_date}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{p.restaurant_name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        p.payment_type === 'setup'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {p.payment_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-900">₹{p.amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-500">{p.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Create New Restaurant */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Create Restaurant Account</h3>
                <p className="text-xs text-slate-500">Creates owner login, billing rules, and initial tables.</p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRestaurant} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Restaurant Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Royal Tandoor Bistro"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Owner Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="owner@domain.com"
                    value={formData.owner_email}
                    onChange={(e) => setFormData({ ...formData, owner_email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Temporary Password</label>
                  <input
                    type="text"
                    placeholder="Auto-generated if empty"
                    value={formData.temporary_password}
                    onChange={(e) => setFormData({ ...formData, temporary_password: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Monthly Fee (₹)</label>
                  <input
                    type="number"
                    value={formData.monthly_fee}
                    onChange={(e) => setFormData({ ...formData, monthly_fee: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Tables</label>
                  <input
                    type="number"
                    value={formData.max_tables}
                    onChange={(e) => setFormData({ ...formData, max_tables: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Initial Paid Until Date</label>
                <input
                  type="date"
                  value={formData.paid_until}
                  onChange={(e) => setFormData({ ...formData, paid_until: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="setup_fee_paid"
                  checked={formData.setup_fee_paid}
                  onChange={(e) => setFormData({ ...formData, setup_fee_paid: e.target.checked })}
                  className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                />
                <label htmlFor="setup_fee_paid" className="font-semibold text-slate-700 cursor-pointer">
                  Registration setup fee paid (₹5,000 via UPI/Cash)
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold shadow-md shadow-orange-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Fees & Max Tables */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Edit Fees & Limit for {isEditOpen.name}</h3>
            <p className="text-xs text-slate-500 mt-1">Owners cannot modify these database-locked values.</p>

            <form onSubmit={handleSaveEditFees} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Monthly Maintenance Fee (₹)</label>
                <input
                  type="number"
                  value={editFormData.monthly_fee}
                  onChange={(e) => setEditFormData({ ...editFormData, monthly_fee: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Max Allowed Tables</label>
                <input
                  type="number"
                  value={editFormData.max_tables}
                  onChange={(e) => setEditFormData({ ...editFormData, max_tables: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(null)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-orange-600 text-white font-bold rounded-lg shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Reset Password */}
      {isResetPassOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Reset Owner Password</h3>
            <p className="text-xs text-slate-500 mt-1">For {isResetPassOpen.name}</p>

            <form onSubmit={handleSaveResetPassword} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Temporary Password</label>
                <input
                  type="text"
                  required
                  value={resetPassValue}
                  onChange={(e) => setResetPassValue(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsResetPassOpen(null)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-orange-600 text-white font-bold rounded-lg shadow-sm"
                >
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
