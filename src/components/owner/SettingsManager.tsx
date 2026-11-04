'use client';

import React, { useState } from 'react';
import { Restaurant } from '@/types/database';
import { Store } from '@/lib/store';
import { SoundAlert } from '@/lib/audio-alert';
import {
  Store as StoreIcon,
  Volume2,
  VolumeX,
  Lock,
  CheckCircle2,
  Bell,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

interface Props {
  restaurant: Restaurant;
  onRefresh: () => void;
}

export function SettingsManager({ restaurant, onRefresh }: Props) {
  const [formData, setFormData] = useState({
    name: restaurant.name,
    phone: restaurant.phone || '',
    address: restaurant.address || '',
    logo_url: restaurant.logo_url || '',
    gst_number: restaurant.gst_number || '',
    gst_percent: restaurant.gst_percent,
    service_charge_percent: restaurant.service_charge_percent,
    currency_symbol: restaurant.currency_symbol || '₹',
    opening_hours: restaurant.opening_hours || '10:00 AM - 11:00 PM',
    sound_enabled: restaurant.sound_enabled,
    sound_volume: restaurant.sound_volume,
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleTestChime = () => {
    SoundAlert.playChime(formData.sound_volume);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Calls updateRestaurantAsOwner which enforces Postgres anti-tamper constraint!
      Store.updateRestaurantAsOwner(restaurant.id, {
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        logo_url: formData.logo_url,
        gst_number: formData.gst_number,
        gst_percent: Number(formData.gst_percent),
        service_charge_percent: Number(formData.service_charge_percent),
        currency_symbol: formData.currency_symbol,
        opening_hours: formData.opening_hours,
        sound_enabled: formData.sound_enabled,
        sound_volume: Number(formData.sound_volume),
      });

      setToastMessage('Restaurant profile & sound settings saved successfully!');
      setTimeout(() => setToastMessage(null), 3000);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error saving settings');
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-bold text-sm">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
        <h2 className="text-xl font-extrabold text-slate-900">Restaurant Settings</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure branding, receipts, taxes, and loud audio alerts.
        </p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Profile Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4 text-xs">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            Branding & Contact Info
          </h3>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Restaurant Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Opening Hours</label>
              <input
                type="text"
                value={formData.opening_hours}
                onChange={(e) => setFormData({ ...formData, opening_hours: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Physical Address</label>
            <textarea
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Logo URL</label>
            <input
              type="text"
              value={formData.logo_url}
              onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
        </div>

        {/* Taxes & Bill Calculations */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4 text-xs">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            Taxes & Receipts Configuration
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">GST / Tax Rate (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.gst_percent}
                onChange={(e) => setFormData({ ...formData, gst_percent: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Service Charge (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.service_charge_percent}
                onChange={(e) =>
                  setFormData({ ...formData, service_charge_percent: Number(e.target.value) })
                }
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Currency Symbol</label>
              <input
                type="text"
                value={formData.currency_symbol}
                onChange={(e) => setFormData({ ...formData, currency_symbol: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">GSTIN Number (Optional)</label>
            <input
              type="text"
              placeholder="e.g. 29AAAAA0000A1Z5"
              value={formData.gst_number}
              onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
        </div>

        {/* Audio Alerts */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4 text-xs">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            Incoming Order Sound & Volume
          </h3>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-800 text-sm">Enable Kitchen Bell Alerts</div>
              <div className="text-slate-500 text-xs">
                Plays loud chime continuously on incoming orders until staff clicks Accept or Reject.
              </div>
            </div>
            <input
              type="checkbox"
              checked={formData.sound_enabled}
              onChange={(e) => setFormData({ ...formData, sound_enabled: e.target.checked })}
              className="w-5 h-5 text-orange-600 rounded"
            />
          </div>

          {formData.sound_enabled && (
            <div className="space-y-2 pt-2">
              <div className="flex justify-between font-semibold text-slate-700">
                <span>Sound Volume</span>
                <span>{Math.round(formData.sound_volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={formData.sound_volume}
                onChange={(e) => setFormData({ ...formData, sound_volume: Number(e.target.value) })}
                className="w-full accent-orange-600 cursor-pointer"
              />
              <button
                type="button"
                onClick={handleTestChime}
                className="mt-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold flex items-center gap-1.5 transition"
              >
                <Bell className="w-3.5 h-3.5 text-orange-600" />
                <span>Test Alert Sound</span>
              </button>
            </div>
          )}
        </div>

        {/* Database Locked Subscription Info (Anti-Tamper showcase) */}
        <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200/80 text-xs space-y-3">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Lock className="w-4 h-4 text-slate-500" />
            <span>Database Protected Subscription Information</span>
          </div>
          <p className="text-slate-500">
            Per the SaaS business model, these values are guarded by a PostgreSQL database trigger
            (<code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">prevent_owner_tampering</code>) and can only be updated by the Super Admin.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="bg-white p-3 rounded-2xl border border-slate-200">
              <span className="text-slate-400 font-semibold uppercase text-[10px] block">Status</span>
              <span className="font-extrabold text-slate-900 capitalize text-sm">{restaurant.status}</span>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-slate-200">
              <span className="text-slate-400 font-semibold uppercase text-[10px] block">Paid Until</span>
              <span className="font-extrabold text-slate-900 text-sm">{restaurant.paid_until}</span>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-slate-200">
              <span className="text-slate-400 font-semibold uppercase text-[10px] block">Monthly Fee</span>
              <span className="font-extrabold text-slate-900 text-sm">₹{restaurant.monthly_fee}</span>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-slate-200">
              <span className="text-slate-400 font-semibold uppercase text-[10px] block">Max Tables</span>
              <span className="font-extrabold text-slate-900 text-sm">{restaurant.max_tables}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-extrabold rounded-2xl shadow-lg shadow-orange-500/25 transition text-sm"
          >
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
}
