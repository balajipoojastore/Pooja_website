import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { buildInvoicePdf } from './invoice-pdf';

it('builds a PDF invoice without tracking secrets', async () => {
  const pdfBytes = await buildInvoicePdf({ storeName: 'The Pooja House', storeContact: 'support@example.test', orderNumber: 'TPH-20260816-000001', orderDate: '2026-08-16T10:00:00Z', customerName: 'Ananya', subtotalPaise: 10000, discountPaise: 1000, deliveryFeePaise: 500, totalPaise: 9500, lines: [{ product_name: 'Brass Diya', sku: 'B001', unit_label: '1 piece', unit_price_paise: 10000, quantity: 1, line_total_paise: 10000 }] });
  const pdf = new TextDecoder().decode(pdfBytes);
  expect(new TextDecoder().decode(pdfBytes.slice(0, 8)).startsWith('%PDF-')).toBe(true);
  const document = await PDFDocument.load(pdfBytes);
  expect(document.getTitle()).toBe('TPH-20260816-000001 invoice');
  expect(document.getPageCount()).toBeGreaterThan(0);
  expect(pdf).not.toContain('tracking_token');
});
