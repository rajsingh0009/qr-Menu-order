'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Restaurant, Order, Bill } from '@/types/database';
import { Store } from '@/lib/store';
import { formatCurrency } from '@/lib/bill-utils';
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  Clock,
  Award,
  CheckCircle2,
  XCircle,
  IndianRupee,
  ShoppingBag,
} from 'lucide-react';

interface Props {
  restaurant: Restaurant;
}

export function ReportsManager({ restaurant }: Props) {
  const [selectedMonth, setSelectedMonth] = useState('2026-11');
  const [todayStr, setTodayStr] = useState('2026-11-01');

  const [dateRange, setDateRange] = useState({
    start: '2026-10-01',
    end: '2026-11-01',
  });

  const orders = useMemo(() => Store.getOrders(restaurant.id), [restaurant.id]);
  const bills = useMemo(() => Store.getBills(restaurant.id), [restaurant.id]);

  useEffect(() => {
    const d = new Date();
    const currentMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const isoToday = d.toISOString().split('T')[0];
    const isoStart = new Date(d.getTime() - 30 * 86400000).toISOString().split('T')[0];

    setSelectedMonth(currentMonth);
    setTodayStr(isoToday);
    setDateRange({ start: isoStart, end: isoToday });
  }, []);

  // Today's metrics
  const todayMetrics = useMemo(() => {
    const todayOrders = orders.filter((o) => o.created_at.startsWith(todayStr));
    const todayBills = bills.filter((b) => b.created_at.startsWith(todayStr));

    const totalOrders = todayOrders.length;
    const acceptedCount = todayOrders.filter((o) =>
      ['accepted', 'preparing', 'ready', 'served', 'completed'].includes(o.status)
    ).length;
    const rejectedCount = todayOrders.filter((o) => o.status === 'rejected').length;

    const totalRev = todayBills.reduce((sum, b) => sum + Number(b.grand_total), 0);
    const avgOrderVal = todayBills.length > 0 ? totalRev / todayBills.length : 0;

    return { totalOrders, acceptedCount, rejectedCount, totalRev, avgOrderVal };
  }, [orders, bills, todayStr]);

  // Last 30 days daily order volume for bar chart
  const thirtyDayHistory = useMemo(() => {
    const days: { date: string; label: string; count: number; rev: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().split('T')[0];
      const label = `${d.getDate()}/${d.getMonth() + 1}`;

      const count = orders.filter((o) => o.created_at.startsWith(iso)).length;
      const rev = bills
        .filter((b) => b.created_at.startsWith(iso))
        .reduce((sum, b) => sum + Number(b.grand_total), 0);

      days.push({ date: iso, label, count, rev });
    }
    return days;
  }, [orders, bills]);

  const max30DayOrders = Math.max(...thirtyDayHistory.map((d) => d.count), 5);

  // Selected Month Report Analytics
  const monthlyMetrics = useMemo(() => {
    const monthBills = bills.filter((b) => b.created_at.startsWith(selectedMonth));
    const monthOrders = orders.filter((o) => o.created_at.startsWith(selectedMonth));

    const totalRevenue = monthBills.reduce((sum, b) => sum + Number(b.grand_total), 0);
    const totalOrderCount = monthOrders.length;

    // Top selling items
    const itemMap = new Map<string, { name: string; qty: number; revenue: number }>();
    monthBills.forEach((b) => {
      b.items_json.forEach((it) => {
        const key = it.name;
        const current = itemMap.get(key) || { name: it.name, qty: 0, revenue: 0 };
        current.qty += it.quantity;
        current.revenue += it.total_price;
        itemMap.set(key, current);
      });
    });

    const topItems = Array.from(itemMap.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);

    // Busiest hours
    const hourMap = new Array(24).fill(0);
    monthOrders.forEach((o) => {
      const hour = new Date(o.created_at).getHours();
      hourMap[hour]++;
    });

    const busiestHours = hourMap
      .map((count, hour) => ({
        hour: `${hour % 12 === 0 ? 12 : hour % 12}:00 ${hour >= 12 ? 'PM' : 'AM'}`,
        count,
      }))
      .filter((h) => h.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return { totalRevenue, totalOrderCount, topItems, busiestHours };
  }, [selectedMonth, bills, orders]);

  // Export CSV for date range
  const handleExportCustomCSV = () => {
    const rangeBills = bills.filter((b) => {
      const bDate = b.created_at.split('T')[0];
      return bDate >= dateRange.start && bDate <= dateRange.end;
    });

    const headers = 'Bill Number,Date,Table,Payment Method,Subtotal,Tax,Service Charge,Grand Total\n';
    const rows = rangeBills
      .map(
        (b) =>
          `"${b.bill_number}","${b.created_at}","${b.table_number}","${b.payment_method}","${b.subtotal}","${b.tax_amount}","${b.service_charge_amount}","${b.grand_total}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${restaurant.slug}-sales-${dateRange.start}-to-${dateRange.end}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Sales & Kitchen Analytics</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time daily metrics, order acceptance rates, peak kitchen hours, and CSV exports.
          </p>
        </div>

        {/* Date range CSV Export bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5"
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5"
          />
          <button
            onClick={handleExportCustomCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* TODAY'S METRICS CARDS */}
      <div>
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">
          Today's Performance ({todayStr})
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Revenue */}
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-5 rounded-3xl shadow-sm">
            <div className="flex items-center justify-between text-emerald-100 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Today's Revenue</span>
              <IndianRupee className="w-4 h-4" />
            </div>
            <div className="text-2xl sm:text-3xl font-black">
              {formatCurrency(todayMetrics.totalRev, restaurant.currency_symbol)}
            </div>
            <div className="text-xs text-emerald-100/90 mt-1">Paid receipts today</div>
          </div>

          {/* Orders Count */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Orders Count</span>
              <ShoppingBag className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">{todayMetrics.totalOrders}</div>
            <div className="text-xs text-slate-500 mt-1">QR placed orders</div>
          </div>

          {/* Average Order Value */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Average Order (AOV)</span>
              <TrendingUp className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {formatCurrency(todayMetrics.avgOrderVal, restaurant.currency_symbol)}
            </div>
            <div className="text-xs text-slate-500 mt-1">Per table session</div>
          </div>

          {/* Accepted vs Rejected */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Accepted vs Rejected</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-600">{todayMetrics.acceptedCount}</span>
              <span className="text-xs text-slate-400">acc /</span>
              <span className="text-xl font-bold text-rose-500">{todayMetrics.rejectedCount}</span>
              <span className="text-xs text-slate-400">rej</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">Kitchen acceptance efficiency</div>
          </div>
        </div>
      </div>

      {/* 30-DAY DAILY ORDERS BAR CHART */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Daily Order Volume (Last 30 Days)</h3>
            <p className="text-xs text-slate-500">Number of QR table orders placed per day</p>
          </div>
          <BarChart3 className="w-5 h-5 text-slate-400" />
        </div>

        <div className="h-44 flex items-end gap-1.5 pt-4 border-b border-slate-100 overflow-x-auto pb-2">
          {thirtyDayHistory.map((d) => {
            const heightPercent = Math.max(Math.round((d.count / max30DayOrders) * 100), 8);
            const isToday = d.date === todayStr;

            return (
              <div key={d.date} className="flex-1 min-w-[20px] flex flex-col items-center group">
                <div className="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition font-bold mb-1">
                  {d.count}
                </div>
                <div
                  style={{ height: `${heightPercent}%` }}
                  className={`w-full rounded-t-lg transition ${
                    isToday
                      ? 'bg-orange-600 group-hover:bg-orange-700'
                      : d.count > 0
                      ? 'bg-slate-800 group-hover:bg-slate-900'
                      : 'bg-slate-100'
                  }`}
                  title={`${d.date}: ${d.count} orders (₹${d.rev})`}
                />
                <span className="text-[9px] text-slate-400 mt-2 truncate w-full text-center">{d.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* MONTHLY REVENUE & PRODUCT INSIGHTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 10 Selling Dishes */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-orange-500" />
              <h3 className="text-base font-extrabold text-slate-900">Top 10 Selling Dishes</h3>
            </div>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1"
            />
          </div>

          <div className="space-y-3">
            {monthlyMetrics.topItems.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No dishes billed in this month.</div>
            ) : (
              monthlyMetrics.topItems.map((it, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 font-bold text-slate-600 flex items-center justify-center text-[10px]">
                      #{idx + 1}
                    </span>
                    <span className="font-semibold text-slate-800">{it.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500 font-medium">{it.qty} ordered</span>
                    <span className="font-bold text-slate-900">₹{it.revenue.toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Busiest Dining Hours */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-500" />
              <h3 className="text-base font-extrabold text-slate-900">Busiest Dining Hours</h3>
            </div>
            <span className="text-xs font-bold text-slate-400">Month: {selectedMonth}</span>
          </div>

          <div className="space-y-3">
            {monthlyMetrics.busiestHours.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No order timing data for this month.</div>
            ) : (
              monthlyMetrics.busiestHours.map((h, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span>{h.hour}</span>
                    <span>{h.count} orders placed</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{
                        width: `${Math.min(
                          (h.count / Math.max(...monthlyMetrics.busiestHours.map((x) => x.count), 1)) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
