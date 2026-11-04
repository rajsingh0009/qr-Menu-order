'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Shield, Store, Lock, Mail, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Props {
  defaultRole?: 'admin' | 'owner';
  onSuccess?: () => void;
}

export function LoginForm({ defaultRole = 'owner', onSuccess }: Props) {
  const [role, setRole] = useState<'admin' | 'owner'>(defaultRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();

  const isDemoEnabled = process.env.NEXT_PUBLIC_ENABLE_DEMO === 'true';

  const handleFillDemo = (type: 'admin' | 'owner_active' | 'owner_expired') => {
    if (type === 'admin') {
      setRole('admin');
      setEmail('admin@qrapi.com');
      setPassword('Admin@123');
    } else if (type === 'owner_active') {
      setRole('owner');
      setEmail('owner@spicegarden.com');
      setPassword('Owner@123');
    } else if (type === 'owner_expired') {
      setRole('owner');
      setEmail('owner@curryhouse.com');
      setPassword('Owner@123');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await login(email, password);
      if (!res.success) {
        setError(res.error || 'Login failed. Please verify your email and password.');
      } else {
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during login.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-xl border border-slate-200">
      <div className="text-center mb-6">
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 transition ${
            role === 'admin' ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'
          }`}
        >
          {role === 'admin' ? <Shield className="w-7 h-7" /> : <Store className="w-7 h-7" />}
        </div>

        <h2 className="text-2xl font-black text-slate-900">
          {role === 'admin' ? 'Super Admin Portal' : 'Restaurant Owner Portal'}
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          {role === 'admin'
            ? 'Sign in to manage restaurants and maintenance billing.'
            : 'Sign in to access your live kitchen orders, menu, and reports.'}
        </p>

        {/* Role Toggle Tabs */}
        <div className="mt-4 grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setRole('owner');
              setError(null);
            }}
            className={`py-2 rounded-xl transition ${
              role === 'owner' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Restaurant Owner
          </button>
          <button
            type="button"
            onClick={() => {
              setRole('admin');
              setError(null);
            }}
            className={`py-2 rounded-xl transition ${
              role === 'admin' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Super Admin
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block font-bold text-slate-700 mb-1">Email Address</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              placeholder={role === 'admin' ? 'admin@qrapi.com' : 'owner@yourrestaurant.com'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-3 text-white rounded-2xl text-xs font-black shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 ${
            role === 'admin'
              ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-500/20'
              : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
          }`}
        >
          <span>{isSubmitting ? 'Signing In...' : 'Sign In'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      {/* Demo Credentials Helper (visible only if demo mode is explicitly enabled) */}
      {isDemoEnabled && (
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center mb-2">
            Quick Fill Demo Credentials
          </div>
          <div className="flex flex-wrap gap-1.5 justify-center">
            <button
              type="button"
              onClick={() => handleFillDemo('admin')}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 transition"
            >
              Admin Demo
            </button>
            <button
              type="button"
              onClick={() => handleFillDemo('owner_active')}
              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-[11px] font-semibold text-emerald-800 transition"
            >
              Active Owner Demo
            </button>
            <button
              type="button"
              onClick={() => handleFillDemo('owner_expired')}
              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 rounded-lg text-[11px] font-semibold text-rose-800 transition"
            >
              Expired Owner Demo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
