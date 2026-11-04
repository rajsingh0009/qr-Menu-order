'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Restaurant, RestaurantTable } from '@/types/database';
import { Store } from '@/lib/store';
import { generateQrDataUrl, downloadQrPng, generateTablesPdf } from '@/lib/qr-pdf-export';
import {
  Plus,
  QrCode,
  Download,
  Printer,
  RefreshCw,
  ExternalLink,
  Trash2,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';

interface Props {
  restaurant: Restaurant;
}

export function TablesManager({ restaurant }: Props) {
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [isAddTableOpen, setIsAddTableOpen] = useState(false);
  const [newTableNum, setNewTableNum] = useState<number>(1);
  const [newTableName, setNewTableName] = useState<string>('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://qrapi.com';

  const loadTables = async () => {
    const list = Store.getTables(restaurant.id);
    setTables(list);

    // Generate QRs
    const map: Record<string, string> = {};
    for (const t of list) {
      const url = `${origin}/r/${restaurant.slug}/t/${t.token}`;
      map[t.id] = await generateQrDataUrl(url);
    }
    setQrMap(map);

    // Compute next suggested table number
    const maxNum = list.reduce((max, t) => Math.max(max, t.table_number), 0);
    setNewTableNum(maxNum + 1);
    setNewTableName(`Table ${maxNum + 1}`);
  };

  useEffect(() => {
    loadTables();
    window.addEventListener('qrsaas_storage_update', loadTables);
    return () => window.removeEventListener('qrsaas_storage_update', loadTables);
  }, [restaurant.id, restaurant.slug]);

  const handleAddTable = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      Store.createTable(restaurant.id, newTableNum, newTableName);
      setIsAddTableOpen(false);
      loadTables();
    } catch (err: any) {
      alert(err.message || 'Failed to create table');
    }
  };

  const handleRegenerateToken = (tableId: string) => {
    if (confirm('Regenerate QR token for this table? Any old printed QR cards for this table will stop working.')) {
      Store.regenerateTableToken(tableId);
      loadTables();
    }
  };

  const handleDeleteTable = (tableId: string) => {
    if (confirm('Delete this table?')) {
      Store.deleteTable(tableId);
      loadTables();
    }
  };

  const handleDownloadSingleQr = (table: RestaurantTable) => {
    const dataUrl = qrMap[table.id];
    if (dataUrl) {
      downloadQrPng(dataUrl, `${restaurant.slug}-table-${table.table_number}-qr`);
    }
  };

  const handleDownloadAllPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      await generateTablesPdf(restaurant.name, restaurant.slug, tables, origin);
    } catch (err) {
      alert('Failed to generate PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleCopyLink = (token: string) => {
    const url = `${origin}/r/${restaurant.slug}/t/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const isLimitReached = tables.length >= restaurant.max_tables;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-slate-900">Table QR Codes</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
              {tables.length} / {restaurant.max_tables} Limit
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Every table has a unique cryptographic token URL. Scan to place instant kitchen orders.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleDownloadAllPdf}
            disabled={tables.length === 0 || isGeneratingPdf}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download All as Printable PDF'}</span>
          </button>

          <button
            onClick={() => setIsAddTableOpen(true)}
            disabled={isLimitReached}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl transition shadow-md shadow-orange-500/20 disabled:opacity-50"
            title={isLimitReached ? 'Max table limit reached. Contact admin.' : 'Add table'}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Table</span>
          </button>
        </div>
      </div>

      {/* Limit Notice if reached */}
      {isLimitReached && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between text-xs text-amber-900 font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              You have reached your subscription limit of <strong>{restaurant.max_tables} tables</strong>. Contact{' '}
              {restaurant.admin_contact_phone} to upgrade your table limit.
            </span>
          </div>
        </div>
      )}

      {/* Tables Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {tables.map((table) => {
          const qrUrl = `${origin}/r/${restaurant.slug}/t/${table.token}`;
          const qrImg = qrMap[table.id];

          return (
            <div
              key={table.id}
              className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                {/* Table Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      {table.table_name || `Table ${table.table_number}`}
                    </h3>
                    <div className="text-[11px] text-slate-400 font-mono">#{table.table_number}</div>
                  </div>

                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                    Active
                  </span>
                </div>

                {/* QR Code Container */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col items-center justify-center">
                  {qrImg ? (
                    <img src={qrImg} alt={`Table ${table.table_number} QR`} className="w-40 h-40 rounded-xl" />
                  ) : (
                    <div className="w-40 h-40 flex items-center justify-center text-slate-300">
                      <QrCode className="w-12 h-12 animate-pulse" />
                    </div>
                  )}

                  <div className="text-[10px] text-slate-400 font-mono mt-2 truncate max-w-[200px]">
                    /r/{restaurant.slug}/t/{table.token.substring(0, 14)}...
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 mt-4 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleDownloadSingleQr(table)}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PNG</span>
                  </button>

                  <a
                    href={qrUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-xl text-xs font-bold transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Test Customer View</span>
                  </a>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => handleCopyLink(table.token)}
                    className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold"
                  >
                    {copiedToken === table.token ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-600">Copied Link!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleRegenerateToken(table.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                      title="Regenerate QR Token"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteTable(table.id)}
                      className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Delete Table"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: Add Table */}
      {isAddTableOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Add Dining Table</h3>
            <p className="text-xs text-slate-500 mt-0.5">Generates a unique QR code for the table</p>

            <form onSubmit={handleAddTable} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Table Number</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={newTableNum}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setNewTableNum(val);
                    setNewTableName(`Table ${val}`);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Table Label / Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Table 4 - Patio / Balcony"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddTableOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-orange-600 text-white font-bold rounded-lg shadow-sm"
                >
                  Create QR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
