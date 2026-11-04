'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { SubscriptionBanners } from '@/components/owner/SubscriptionBanners';
import { LiveOrders } from '@/components/owner/LiveOrders';
import { MenuManager } from '@/components/owner/MenuManager';
import { TablesManager } from '@/components/owner/TablesManager';
import { BillsManager } from '@/components/owner/BillsManager';
import { ReportsManager } from '@/components/owner/ReportsManager';
import { SettingsManager } from '@/components/owner/SettingsManager';
import {
  UtensilsCrossed,
  BookOpen,
  QrCode,
  Receipt,
  BarChart3,
  Settings,
  LogOut,
  Store as StoreIcon,
  ExternalLink,
} from 'lucide-react';

function DashboardContent() {
  const { user, restaurant, logout, refreshRestaurant } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const activeTab = searchParams.get('tab') || 'orders';
  const [selectedTableToBill, setSelectedTableToBill] = useState<string | null>(null);

  const handleTabChange = (tab: string) => {
    router.push(`/dashboard?tab=${tab}`);
  };

  const handleOpenBillModal = (tableId: string) => {
    setSelectedTableToBill(tableId);
    handleTabChange('bills');
  };

  // If not logged in as owner or restaurant is missing, show helpful login/switcher prompt
  if (!user || user.role !== 'owner' || !restaurant) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-xl border border-slate-200">
          <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-3">
            <StoreIcon className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-slate-900">Owner Login Required</h2>
          <p className="text-xs text-slate-500 mt-2">
            Please log in with your restaurant owner credentials or use the Demo Switcher at the top right to switch into an Owner account.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link
              href="/"
              className="py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
            >
              Return to Home
            </Link>
            <Link
              href="/admin"
              className="py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition"
            >
              Super Admin Panel
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf8f5] text-slate-900">
      {/* OWNER DASHBOARD NAVBAR */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Restaurant Info & Brand */}
            <div className="flex items-center gap-3">
              {restaurant.logo_url ? (
                <img
                  src={restaurant.logo_url}
                  alt={restaurant.name}
                  className="w-9 h-9 rounded-xl object-cover border border-slate-200"
                />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center font-black">
                  🍽️
                </div>
              )}

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-extrabold text-slate-900">{restaurant.name}</h1>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      restaurant.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {restaurant.status}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-medium">
                  Owner Dashboard • Slug: /{restaurant.slug}
                </div>
              </div>
            </div>

            {/* Right side links */}
            <div className="flex items-center gap-2">
              <Link
                href={`/r/${restaurant.slug}/t/sg_tbl_1_tok_84920412`}
                target="_blank"
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-bold rounded-xl transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Customer QR Preview</span>
              </Link>

              <button
                onClick={() => logout()}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs Bar */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
            {[
              { id: 'orders', label: 'Live Orders', icon: UtensilsCrossed },
              { id: 'menu', label: 'Menu Manager', icon: BookOpen },
              { id: 'tables', label: 'Tables & QR', icon: QrCode },
              { id: 'bills', label: 'Bills & Receipts', icon: Receipt },
              { id: 'reports', label: 'Reports', icon: BarChart3 },
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Dynamic Subscription Banners */}
        <SubscriptionBanners restaurant={restaurant} currentTab={activeTab} />

        {/* Tab Components */}
        {activeTab === 'orders' && (
          <LiveOrders restaurant={restaurant} onOpenBillModal={handleOpenBillModal} />
        )}

        {activeTab === 'menu' && <MenuManager restaurant={restaurant} />}

        {activeTab === 'tables' && <TablesManager restaurant={restaurant} />}

        {activeTab === 'bills' && (
          <BillsManager
            restaurant={restaurant}
            selectedTableToBill={selectedTableToBill}
            onCloseSettleModal={() => setSelectedTableToBill(null)}
          />
        )}

        {activeTab === 'reports' && <ReportsManager restaurant={restaurant} />}

        {activeTab === 'settings' && (
          <SettingsManager restaurant={restaurant} onRefresh={refreshRestaurant} />
        )}
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-xs font-bold text-slate-400">Loading Dashboard...</div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
