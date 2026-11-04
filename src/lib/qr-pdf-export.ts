// ==============================================================================
// QR Code Generator & PDF Printing Utility
// ==============================================================================

import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import { RestaurantTable } from '@/types/database';

export async function generateQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    width: 320,
    margin: 2,
    color: {
      dark: '#1e293b',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'H',
  });
}

export function downloadQrPng(dataUrl: string, fileName: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `${fileName}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generates a clean, ready-to-print multi-card PDF for tables.
 * Fits up to 4 table cards per A4 page with high-res QR, restaurant title, and instructions.
 */
export async function generateTablesPdf(
  restaurantName: string,
  restaurantSlug: string,
  tables: RestaurantTable[],
  origin: string
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const cardWidth = 88;
  const cardHeight = 120;
  const marginX = (pageWidth - cardWidth * 2) / 3; // ~11mm
  const marginY = 16;
  const spacingY = 14;

  let currentOnPage = 0;

  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    if (currentOnPage === 4) {
      doc.addPage();
      currentOnPage = 0;
    }

    const col = currentOnPage % 2;
    const row = Math.floor(currentOnPage / 2);
    const x = marginX + col * (cardWidth + marginX);
    const y = marginY + row * (cardHeight + spacingY);

    // Card border & rounded look
    doc.setDrawColor(220, 220, 220);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, cardWidth, cardHeight, 4, 4, 'FD');

    // Accent top banner
    doc.setFillColor(249, 115, 22); // Orange primary
    doc.rect(x, y, cardWidth, 6, 'F');

    // Restaurant Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(30, 41, 59);
    doc.text(restaurantName, x + cardWidth / 2, y + 16, { align: 'center', maxWidth: cardWidth - 10 });

    // Table Label
    doc.setFontSize(15);
    doc.setTextColor(234, 88, 12);
    doc.text(table.table_name || `Table ${table.table_number}`, x + cardWidth / 2, y + 25, {
      align: 'center',
    });

    // Generate QR
    const qrUrl = `${origin}/r/${restaurantSlug}/t/${table.token}`;
    const qrDataUrl = await generateQrDataUrl(qrUrl);
    doc.addImage(qrDataUrl, 'PNG', x + (cardWidth - 48) / 2, y + 30, 48, 48);

    // Scan instructions
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('SCAN TO VIEW MENU & ORDER', x + cardWidth / 2, y + 86, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('No app required • Point phone camera', x + cardWidth / 2, y + 92, {
      align: 'center',
    });

    // Footer with subtle divider
    doc.setDrawColor(241, 245, 249);
    doc.line(x + 10, y + 102, x + cardWidth - 10, y + 102);

    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('Fast & Touchless Ordering', x + cardWidth / 2, y + 110, { align: 'center' });

    currentOnPage++;
  }

  doc.save(`${restaurantSlug}-table-qrs.pdf`);
}
