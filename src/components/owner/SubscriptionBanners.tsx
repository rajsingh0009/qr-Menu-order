'use client';

import React from 'react';
import Link from 'next/link';
import { Restaurant } from '@/types/database';
import { AlertTriangle, AlertOctagon, Phone, ShieldAlert, BarChart3, Receipt } from 'lucide-react';

interface Props {
  restaurant: Restaurant;
  currentTab: string;
}

export function SubscriptionBanners({ restaurant, currentTab }: Props) {
  const today = new Date();
  const paidUntil = new Date(restaurant.paid_until);
  const diffTime = paidUntil.getTime() - today.getTime();
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const isExpired = restaurant.status === 'expired' || daysLeft < 0;
  const isSuspended = restaurant.status === 'suspended';
  const isDueSoon = !isExpired && !isSuspended && daysLeft <= 5;

  const isBlocked = isExpired || isSuspended;
  // Read-only tabs allowed when subscription is expired: reports and bills
  const isReadOnlyTab = currentTab === 'reports' || currentTab === 'bills';

  return (
    <>
      {/* Yellow Banner: Due in 5 days */}
      {isDueSoon && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2.5 rounded-2xl shadow-md border border-amber-400 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-semibold mb-6 animate-pulse">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-slate-900" />
            <span>
              Maintenance subscription due in <strong className="underline">{daysLeft} days</strong> (due{' '}
              {restaurant.paid_until}). Please renew promptly to prevent automated QR menu suspension.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-slate-800">Admin Contact:</span>
            <a
              href={`tel:${restaurant.admin_contact_phone}`}
              className="inline-flex items-center gap-1 bg-slate-900 text-white px-2.5 py-1 rounded-lg text-xs hover:bg-slate-800 transition"
            >
              <Phone className="w-3 h-3" />
              <span>{restaurant.admin_contact_phone}</span>
            </a>
          </div>
        </div>
      )}

      {/* Red Banner: Expired */}
      {isBlocked && (
        <div className="bg-rose-600 text-white px-4 py-3 rounded-2xl shadow-lg border border-rose-500 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-semibold mb-6">
          <div className="flex items-center gap-2.5">
            <AlertOctagon className="w-5 h-5 flex-shrink-0 animate-bounce" />
            <div>
              <div className="font-bold text-sm">
                {isSuspended ? 'Account Suspended by Administrator' : 'Monthly Maintenance Subscription Expired'}
              </div>
              <div className="text-rose-100 font-normal text-xs mt-0.5">
                Customer QR codes are blocked. You have read-only access to past reports and receipts.
              </div>
            </div>
          </div>
          <a
            href={`tel:${restaurant.admin_contact_phone}`}
            className="inline-flex items-center gap-1.5 bg-white text-rose-700 px-3 py-1.5 rounded-xl font-bold hover:bg-rose-50 transition shadow-sm"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Call Admin: {restaurant.admin_contact_phone}</span>
          </a>
        </div>
      )}

      {/* Full-screen Blocking Overlay when expired on operational tabs */}
      {isBlocked && !isReadOnlyTab && (
        <div className="fixed inset-0 z-40 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 text-center shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-3xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4 shadow-inner">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-100 text-rose-800">
              Subscription Inactive
            </span>

            <h2 className="text-2xl font-black text-slate-900 mt-3">Subscription Expired</h2>
            <p className="text-slate-600 text-sm mt-2 leading-relaxed">
              Live orders and customer table QR ordering are temporarily blocked for <strong>{restaurant.name}</strong>.
              Please contact the system administrator to record your monthly maintenance payment and reactivate.
            </p>

            <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Super Admin Contact</div>
              <a
                href={`tel:${restaurant.admin_contact_phone}`}
                className="inline-flex items-center justify-center gap-2 text-lg font-extrabold text-orange-600 mt-1 hover:underline"
              >
                <Phone className="w-4 h-4" />
                <span>{restaurant.admin_contact_phone}</span>
              </a>
              <div className="text-[11px] text-slate-500 mt-1">UPI & Cash settlements accepted</div>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-5">
              <div className="text-xs text-slate-500 mb-3">You can still view your historical data in read-only mode:</div>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/dashboard?tab=reports"
                  className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  <BarChart3 className="w-4 h-4 text-slate-500" />
                  <span>View Reports</span>
                </Link>
                <Link
                  href="/dashboard?tab=bills"
                  className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  <Receipt className="w-4 h-4 text-slate-500" />
                  <span>View Past Bills</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
