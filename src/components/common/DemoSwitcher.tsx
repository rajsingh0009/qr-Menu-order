'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Store } from '@/lib/store';
import { Shield, Store as StoreIcon, Smartphone, RotateCcw, ChevronDown, Check, ExternalLink } from 'lucide-react';

export function DemoSwitcher() {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { user, switchUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Demo switcher is OFF by default; only shown if NEXT_PUBLIC_ENABLE_DEMO=true
  const isDemoEnabled = process.env.NEXT_PUBLIC_ENABLE_DEMO === 'true';

  if (!isDemoEnabled || !mounted) {
    return null;
  }

  const handleReset = () => {
    if (confirm('Reset demo data to original seed? This will restore Spice Garden Bistro and Curry House.')) {
      Store.resetToDemo();
      window.location.reload();
    }
  };

  return (
    <aside aria-label="Demo role switcher" className="fixed top-2 right-2 z-50 print:hidden">
      <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-full shadow-2xl border border-slate-700/80 px-3 py-1.5 flex items-center gap-2 text-xs">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 font-medium hover:text-orange-400 transition"
          title="Switch Demo Role"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-slate-200">Role:</span>
          <span className="text-orange-300 capitalize">
            {user?.role === 'admin'
              ? 'Super Admin'
              : user?.restaurant?.status === 'expired'
              ? 'Owner (Expired)'
              : 'Owner (Active)'}
          </span>
          <ChevronDown className="w-3.5 h-3.5 opacity-70" />
        </button>

        <span className="text-slate-600">|</span>

        <button
          onClick={handleReset}
          className="flex items-center gap-1 text-slate-400 hover:text-rose-400 transition"
          title="Reset Seed Data"
        >
          <RotateCcw className="w-3 h-3" />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-3 text-slate-200 z-50 text-xs">
          <div className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-2 px-1">
            Switch Demo Account
          </div>

          <button
            onClick={() => {
              switchUser('admin');
              setIsOpen(false);
              router.push('/admin');
            }}
            className={`w-full flex items-center justify-between p-2 rounded-xl mb-1 transition ${
              user?.role === 'admin' ? 'bg-orange-600 text-white font-medium' : 'hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-orange-400" />
              <div className="text-left">
                <div className="font-semibold">Super Admin</div>
                <div className="text-[10px] opacity-75">admin@qrapi.com</div>
              </div>
            </div>
            {user?.role === 'admin' && <Check className="w-4 h-4" />}
          </button>

          <button
            onClick={() => {
              switchUser('owner_active');
              setIsOpen(false);
              router.push('/dashboard');
            }}
            className={`w-full flex items-center justify-between p-2 rounded-xl mb-1 transition ${
              user?.role === 'owner' && user.restaurant?.status === 'active'
                ? 'bg-emerald-600 text-white font-medium'
                : 'hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <StoreIcon className="w-4 h-4 text-emerald-400" />
              <div className="text-left">
                <div className="font-semibold">Spice Garden (Active)</div>
                <div className="text-[10px] opacity-75">owner@spicegarden.com</div>
              </div>
            </div>
            {user?.role === 'owner' && user.restaurant?.status === 'active' && <Check className="w-4 h-4" />}
          </button>

          <button
            onClick={() => {
              switchUser('owner_expired');
              setIsOpen(false);
              router.push('/dashboard');
            }}
            className={`w-full flex items-center justify-between p-2 rounded-xl mb-1 transition ${
              user?.role === 'owner' && user.restaurant?.status === 'expired'
                ? 'bg-rose-600 text-white font-medium'
                : 'hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <StoreIcon className="w-4 h-4 text-rose-400" />
              <div className="text-left">
                <div className="font-semibold">Curry House (Expired)</div>
                <div className="text-[10px] opacity-75">owner@curryhouse.com</div>
              </div>
            </div>
            {user?.role === 'owner' && user.restaurant?.status === 'expired' && <Check className="w-4 h-4" />}
          </button>

          <div className="border-t border-slate-800 my-2 pt-2">
            <div className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-2 px-1">
              Customer QR Scans
            </div>
            <Link
              href="/r/spice-garden/t/sg_tbl_3_tok_74628103"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white"
            >
              <div className="flex items-center gap-2">
                <Smartphone className="w-3.5 h-3.5 text-orange-400" />
                <span>Spice Garden (Table 3)</span>
              </div>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </Link>

            <Link
              href="/r/curry-house/t/ch_tbl_1_tok_11223344"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white"
            >
              <div className="flex items-center gap-2">
                <Smartphone className="w-3.5 h-3.5 text-rose-400" />
                <span>Curry House (Expired Table 1)</span>
              </div>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </Link>
          </div>
        </div>
      )}
    </aside>
  );
}
