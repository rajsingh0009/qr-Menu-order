'use client';

import React, { useState, useEffect } from 'react';
import { Restaurant, Bill, PaymentMethod } from '@/types/database';
import { Store } from '@/lib/store';
import { generateBillPdf, generateWhatsAppBillLink, formatCurrency } from '@/lib/bill-utils';
import {
  Receipt,
  Search,
  Printer,
  Download,
  Share2,
  Calendar,
  Check,
  CreditCard,
  Banknote,
  QrCode,
  ArrowUpRight,
  X,
} from 'lucide-react';

interface Props {
  restaurant: Restaurant;
  selectedTableToBill?: string | null;
  onCloseSettleModal?: () => void;
}

export function BillsManager({ restaurant, selectedTableToBill, onCloseSettleModal }: Props) {
  const [bills, setBills] = useState<Bill[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeBillModal, setActiveBillModal] = useState<Bill | null>(null);

  // Settlement flow for an open table
  const [settlingTableId, setSettlingTableId] = useState<string | null>(selectedTableToBill || null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('upi');
  const [isSettling, setIsSettling] = useState(false);

  const loadBills = () => {
    setBills(Store.getBills(restaurant.id));
  };

  useEffect(() => {
    loadBills();
    window.addEventListener('qrsaas_storage_update', loadBills);
    return () => window.removeEventListener('qrsaas_storage_update', loadBills);
  }, [restaurant.id]);

  useEffect(() => {
    if (selectedTableToBill) {
      setSettlingTableId(selectedTableToBill);
    }
  }, [selectedTableToBill]);

  // Handle settling an active table order
  const handleConfirmSettleBill = () => {
    if (!settlingTableId) return;
    setIsSettling(true);

    try {
      const newBill = Store.generateBill({
        restaurantId: restaurant.id,
        tableId: settlingTableId,
        paymentMethod: selectedPaymentMethod,
      });

      setSettlingTableId(null);
      if (onCloseSettleModal) onCloseSettleModal();
      loadBills();
      setActiveBillModal(newBill);
    } catch (err: any) {
      alert(err.message || 'Failed to generate bill');
    } finally {
      setIsSettling(false);
    }
  };

  const handlePrint = (bill: Bill) => {
    setActiveBillModal(bill);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const filteredBills = bills.filter((b) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      String(b.bill_number).includes(q) ||
      String(b.table_number).includes(q) ||
      b.payment_method.toLowerCase().includes(q) ||
      b.created_at.includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Invoices & Bills Archive</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Sequential fiscal receipts with itemized GST, service charges, thermal printing & WhatsApp sharing.
          </p>
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Bill #, Table, Date..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20"
          />
        </div>
      </div>

      {/* Bills Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Bill Number</th>
                <th className="px-5 py-3.5">Table</th>
                <th className="px-5 py-3.5">Date & Time</th>
                <th className="px-5 py-3.5">Payment Method</th>
                <th className="px-5 py-3.5">Items</th>
                <th className="px-5 py-3.5">Grand Total</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 text-sm">
                    No bills generated yet. Bills are automatically created when table orders are marked as paid.
                  </td>
                </tr>
              ) : (
                filteredBills.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-5 py-4 font-black text-slate-900 text-sm">#{b.bill_number}</td>
                    <td className="px-5 py-4 font-bold text-slate-800">Table {b.table_number}</td>
                    <td className="px-5 py-4 text-slate-500">
                      {new Date(b.created_at).toLocaleString([], {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-800">
                        {b.payment_method}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600 font-medium">{b.items_json.length} items</td>
                    <td className="px-5 py-4 font-black text-slate-900 text-sm">
                      {formatCurrency(b.grand_total, restaurant.currency_symbol)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setActiveBillModal(b)}
                          className="px-2.5 py-1 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold text-[11px] transition"
                        >
                          View Receipt
                        </button>

                        <button
                          onClick={() => generateBillPdf(b)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                          title="Download PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handlePrint(b)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                          title="Print Thermal 80mm Receipt"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Settle Table Order & Generate Bill */}
      {settlingTableId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <h3 className="text-base font-extrabold text-slate-900">Settle Order & Generate Bill</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select customer payment method to close this table session.
            </p>

            <div className="mt-4 space-y-2 text-xs">
              <div className="font-semibold text-slate-700 mb-1">Select Payment Method:</div>
              {(
                [
                  { id: 'upi', label: 'UPI / QR Code', icon: QrCode },
                  { id: 'cash', label: 'Cash at Counter', icon: Banknote },
                  { id: 'card', label: 'Credit / Debit Card', icon: CreditCard },
                ] as const
              ).map((pm) => {
                const Icon = pm.icon;
                return (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setSelectedPaymentMethod(pm.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition font-bold ${
                      selectedPaymentMethod === pm.id
                        ? 'border-orange-500 bg-orange-50 text-orange-950 ring-2 ring-orange-500/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-orange-600" />
                    <span>{pm.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-5 border-t border-slate-100 mt-5">
              <button
                type="button"
                onClick={() => {
                  setSettlingTableId(null);
                  if (onCloseSettleModal) onCloseSettleModal();
                }}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSettling}
                onClick={handleConfirmSettleBill}
                className="px-5 py-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-md disabled:opacity-50"
              >
                {isSettling ? 'Generating...' : 'Complete & Print Bill'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Printable Receipt Preview (80mm Thermal Style) */}
      {activeBillModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Thermal Receipt</span>
              <button
                onClick={() => setActiveBillModal(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable 80mm Receipt Box */}
            <div id="receipt-print-area" className="my-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-slate-900 font-mono text-xs">
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                <div className="font-extrabold text-sm">{activeBillModal.restaurant_name}</div>
                {activeBillModal.restaurant_address && (
                  <div className="text-[10px] text-slate-500 mt-0.5">{activeBillModal.restaurant_address}</div>
                )}
                {activeBillModal.restaurant_phone && (
                  <div className="text-[10px] text-slate-500">Ph: {activeBillModal.restaurant_phone}</div>
                )}
                {activeBillModal.restaurant_gst && (
                  <div className="text-[10px] text-slate-500">GSTIN: {activeBillModal.restaurant_gst}</div>
                )}
              </div>

              <div className="py-2 border-b border-dashed border-slate-300 text-[11px] flex justify-between">
                <div>
                  <strong>BILL #{activeBillModal.bill_number}</strong>
                  <div className="text-slate-500 text-[10px]">
                    {new Date(activeBillModal.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div className="text-right">
                  <strong>Table {activeBillModal.table_number}</strong>
                  <div className="text-slate-500 text-[10px] uppercase">{activeBillModal.payment_method}</div>
                </div>
              </div>

              {/* Items List */}
              <div className="py-2 border-b border-dashed border-slate-300 space-y-1.5">
                {activeBillModal.items_json.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-start text-xs">
                    <div>
                      <span>{it.quantity}x {it.name}</span>
                    </div>
                    <span className="font-bold">₹{it.total_price.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="py-2 border-b border-dashed border-slate-300 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{activeBillModal.subtotal.toFixed(2)}</span>
                </div>
                {activeBillModal.tax_amount > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>GST ({activeBillModal.tax_percent}%):</span>
                    <span>₹{activeBillModal.tax_amount.toFixed(2)}</span>
                  </div>
                )}
                {activeBillModal.service_charge_amount > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Service Chg ({activeBillModal.service_charge_percent}%):</span>
                    <span>₹{activeBillModal.service_charge_amount.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-between items-center text-sm font-black">
                <span>GRAND TOTAL:</span>
                <span>₹{activeBillModal.grand_total.toFixed(2)}</span>
              </div>

              <div className="text-center pt-3 text-[10px] text-slate-400">
                Thank you! Please visit again.
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => generateBillPdf(activeBillModal)}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
              </div>

              <a
                href={generateWhatsAppBillLink(activeBillModal)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition shadow-sm"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Receipt on WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
