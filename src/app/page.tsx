'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  QrCode,
  Shield,
  Store,
  Smartphone,
  CheckCircle2,
  Bell,
  Receipt,
  ArrowRight,
  Sparkles,
  Zap,
  Lock,
  TrendingUp,
  CreditCard,
  ChefHat,
  Printer,
  Share2,
} from 'lucide-react';

export default function HomePage() {
  const { switchUser } = useAuth();

  return (
    <div className="min-h-screen bg-[#faf8f5] text-slate-900 selection:bg-orange-500 selection:text-white">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white text-xs font-semibold py-2 px-4 text-center">
        ⚡ Multi-Restaurant QR Ordering SaaS • Supabase Realtime & RLS Protected • PWA Ready
      </div>

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-100 text-orange-800 text-xs font-black uppercase tracking-wider mb-6">
          <Sparkles className="w-3.5 h-3.5 text-orange-600" />
          <span>Complete Turnkey Restaurant SaaS</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-[1.1] max-w-4xl mx-auto">
          Scan to Dine in Seconds.{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-amber-600">
            Zero App Installs.
          </span>
        </h1>

        <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          The all-in-one mobile-first QR ordering web app for dine-in restaurants. Instant kitchen bell alerts,
          automatic UPI/cash subscription enforcement, thermal 80mm receipts, and deep analytics.
        </p>

        {/* Quick Role Jump Cards (For Testing & Showcase) */}
        <div className="mt-10 max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          {/* Super Admin Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-md hover:shadow-xl transition flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mb-4 group-hover:scale-110 transition">
                <Shield className="w-6 h-6" />
              </div>
              <div className="text-[11px] font-black uppercase tracking-wider text-orange-600">Role 1</div>
              <h3 className="text-lg font-black text-slate-900 mt-0.5">Super Admin</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Create & approve restaurants, record manual UPI/cash setup and monthly maintenance fees, suspend or extend access.
              </p>
            </div>

            <Link
              href="/admin"
              onClick={() => switchUser('admin')}
              className="mt-6 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              <span>Open Admin Panel</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Restaurant Owner Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-md hover:shadow-xl transition flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition">
                <Store className="w-6 h-6" />
              </div>
              <div className="text-[11px] font-black uppercase tracking-wider text-emerald-600">Role 2</div>
              <h3 className="text-lg font-black text-slate-900 mt-0.5">Restaurant Owner</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Live orders with loud repeating sound chime, accept/reject, add-on merges, printable QR codes, thermal receipts, and sales reports.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <Link
                href="/dashboard"
                onClick={() => switchUser('owner_active')}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <span>Live Owner (Spice Garden)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/dashboard"
                onClick={() => switchUser('owner_expired')}
                className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-[11px] font-bold transition text-center"
              >
                Expired Owner (Curry House)
              </Link>
            </div>
          </div>

          {/* Customer Ordering Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-md hover:shadow-xl transition flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition">
                <Smartphone className="w-6 h-6" />
              </div>
              <div className="text-[11px] font-black uppercase tracking-wider text-purple-600">Role 3</div>
              <h3 className="text-lg font-black text-slate-900 mt-0.5">Dine-in Customer</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Fast, frictionless QR scan. No app or signup. Sticky tabs, search, veg filter, order tracker, add-ons, and waiter call.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <Link
                href="/r/spice-garden/t/sg_tbl_3_tok_74628103"
                className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <span>Scan Table 3 (Active)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/r/curry-house/t/ch_tbl_1_tok_11223344"
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-bold transition text-center"
              >
                Test Expired Blocked Table
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 border-t border-slate-200/80">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
            Engineered for High-Rush Restaurant Floors
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            Packed with practical, stress-tested features designed for real kitchens.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80">
            <Bell className="w-6 h-6 text-orange-600 mb-3" />
            <h4 className="font-extrabold text-slate-900 text-sm">Loud Repeating Bell</h4>
            <p className="text-xs text-slate-500 mt-1">
              Web Audio chime repeats urgently until kitchen staff clicks Accept or Reject.
            </p>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/80">
            <Receipt className="w-6 h-6 text-emerald-600 mb-3" />
            <h4 className="font-extrabold text-slate-900 text-sm">Thermal 80mm Receipts</h4>
            <p className="text-xs text-slate-500 mt-1">
              Printable thermal receipts with GST, service charge, and 1-click WhatsApp customer share.
            </p>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/80">
            <Lock className="w-6 h-6 text-purple-600 mb-3" />
            <h4 className="font-extrabold text-slate-900 text-sm">Database-Enforced Billing</h4>
            <p className="text-xs text-slate-500 mt-1">
              RLS policies & triggers block unpaid venues automatically even if cron fails.
            </p>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/80">
            <Zap className="w-6 h-6 text-amber-600 mb-3" />
            <h4 className="font-extrabold text-slate-900 text-sm">Instant Add-ons</h4>
            <p className="text-xs text-slate-500 mt-1">
              Customers order more items during dining. New dishes merge automatically into running bill.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing / Business Model Section */}
      <section className="bg-slate-900 text-white py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-orange-500 text-slate-950">
            Business Model
          </span>
          <h2 className="text-3xl sm:text-4xl font-black mt-4">Simple, Direct UPI & Cash Billing</h2>
          <p className="text-slate-400 text-xs sm:text-sm max-w-xl mx-auto mt-2">
            No payment gateways taking 2-3% cuts. The Super Admin collects fees directly by UPI or cash,
            and marks accounts paid in the admin portal.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-10 max-w-2xl mx-auto text-left">
            <div className="bg-slate-800/80 border border-slate-700 p-6 rounded-3xl">
              <div className="text-xs font-bold text-orange-400 uppercase tracking-wider">One-Time</div>
              <div className="text-3xl font-black text-white mt-1">₹5,000</div>
              <div className="text-xs text-slate-300 font-semibold mt-0.5">Registration & Setup Fee</div>
              <ul className="mt-4 space-y-2 text-xs text-slate-400">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Custom menu & categories setup</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>High-resolution printable table QR cards</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Owner onboarding & staff training</span>
                </li>
              </ul>
            </div>

            <div className="bg-slate-800/80 border border-slate-700 p-6 rounded-3xl">
              <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Recurring</div>
              <div className="text-3xl font-black text-white mt-1">₹1,000</div>
              <div className="text-xs text-slate-300 font-semibold mt-0.5">Monthly Maintenance</div>
              <ul className="mt-4 space-y-2 text-xs text-slate-400">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Unlimited live QR orders</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Supabase Realtime alerts & sound</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Automated 5-day expiry warning banners</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
