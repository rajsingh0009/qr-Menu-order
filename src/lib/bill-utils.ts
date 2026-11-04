// ==============================================================================
// Bill PDF Export, Thermal Print & WhatsApp Sharing Utilities
// ==============================================================================

import { jsPDF } from 'jspdf';
import { Bill } from '@/types/database';

export function formatCurrency(amount: number, symbol = '₹'): string {
  return `${symbol}${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function generateWhatsAppBillLink(bill: Bill, phone?: string): string {
  const itemsText = bill.items_json
    .map((it) => `• ${it.name} x${it.quantity} = ₹${it.total_price}`)
    .join('\n');

  const message = `🧾 *RECEIPT / BILL #${bill.bill_number}*
*${bill.restaurant_name}*
${bill.restaurant_address || ''}
${bill.restaurant_phone ? 'Phone: ' + bill.restaurant_phone : ''}
${bill.restaurant_gst ? 'GSTIN: ' + bill.restaurant_gst : ''}
---------------------------------
Table: ${bill.table_number}
Date: ${new Date(bill.created_at).toLocaleString()}
---------------------------------
${itemsText}
---------------------------------
Subtotal: ₹${bill.subtotal.toFixed(2)}
${bill.tax_amount > 0 ? `GST (${bill.tax_percent}%): ₹${bill.tax_amount.toFixed(2)}\n` : ''}${
    bill.service_charge_amount > 0
      ? `Service Charge (${bill.service_charge_percent}%): ₹${bill.service_charge_amount.toFixed(2)}\n`
      : ''
}*Grand Total: ₹${bill.grand_total.toFixed(2)}*
Payment Method: ${bill.payment_method.toUpperCase()}
---------------------------------
Thank you for dining with us!`;

  const encoded = encodeURIComponent(message);
  const target = phone ? phone.replace(/[^0-9]/g, '') : '';
  return `https://wa.me/${target}?text=${encoded}`;
}

/**
 * Generates an 80mm standard thermal roll style PDF or standard A4 invoice
 */
export function generateBillPdf(bill: Bill) {
  // 80mm thermal receipt format (approx 80mm width, dynamic height)
  const itemHeight = bill.items_json.length * 6;
  const totalHeight = Math.max(140 + itemHeight, 180);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, totalHeight],
  });

  let y = 10;
  const centerX = 40;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(bill.restaurant_name, centerX, y, { align: 'center', maxWidth: 70 });
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  if (bill.restaurant_address) {
    doc.text(bill.restaurant_address, centerX, y, { align: 'center', maxWidth: 70 });
    y += 5;
  }
  if (bill.restaurant_phone) {
    doc.text(`Phone: ${bill.restaurant_phone}`, centerX, y, { align: 'center' });
    y += 4;
  }
  if (bill.restaurant_gst) {
    doc.text(`GSTIN: ${bill.restaurant_gst}`, centerX, y, { align: 'center' });
    y += 4;
  }

  // Divider
  doc.setLineDashPattern([1, 1], 0);
  doc.line(5, y, 75, y);
  y += 5;

  // Info
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(`BILL #${bill.bill_number}`, 5, y);
  doc.text(`Table: ${bill.table_number}`, 75, y, { align: 'right' });
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(bill.created_at).toLocaleString(), 5, y);
  y += 5;

  doc.line(5, y, 75, y);
  y += 4;

  // Table header
  doc.setFont('helvetica', 'bold');
  doc.text('Item', 5, y);
  doc.text('Qty', 46, y);
  doc.text('Total', 75, y, { align: 'right' });
  y += 4;
  doc.line(5, y, 75, y);
  y += 4;

  // Items
  doc.setFont('helvetica', 'normal');
  for (const item of bill.items_json) {
    doc.text(item.name, 5, y, { maxWidth: 38 });
    doc.text(String(item.quantity), 48, y);
    doc.text(`₹${item.total_price.toFixed(2)}`, 75, y, { align: 'right' });
    y += 5;
  }

  doc.line(5, y, 75, y);
  y += 5;

  // Totals
  doc.text('Subtotal:', 40, y);
  doc.text(`₹${bill.subtotal.toFixed(2)}`, 75, y, { align: 'right' });
  y += 4;

  if (bill.tax_amount > 0) {
    doc.text(`GST (${bill.tax_percent}%):`, 40, y);
    doc.text(`₹${bill.tax_amount.toFixed(2)}`, 75, y, { align: 'right' });
    y += 4;
  }

  if (bill.service_charge_amount > 0) {
    doc.text(`Service Chg (${bill.service_charge_percent}%):`, 40, y);
    doc.text(`₹${bill.service_charge_amount.toFixed(2)}`, 75, y, { align: 'right' });
    y += 4;
  }

  doc.setLineDashPattern([], 0);
  doc.line(5, y, 75, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('GRAND TOTAL:', 5, y);
  doc.text(`₹${bill.grand_total.toFixed(2)}`, 75, y, { align: 'right' });
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Payment: ${bill.payment_method.toUpperCase()}`, 5, y);
  y += 8;

  // Footer
  doc.setFontSize(7);
  doc.text('Thank you! Visit again.', centerX, y, { align: 'center' });

  doc.save(`bill-${bill.bill_number}.pdf`);
}
