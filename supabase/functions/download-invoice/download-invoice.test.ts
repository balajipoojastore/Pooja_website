import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { buildInvoicePdf } from '../_shared/invoice-pdf';

const source = readFileSync(new URL('./index.ts', import.meta.url), 'utf8');

describe('secure downloadable invoices', () => {
  it('generates a PDF from immutable snapshot values without a tracking secret', async () => {
    const pdfBytes = await buildInvoicePdf({
      storeName: 'The Pooja House',
      storeContact: 'support@example.test',
      orderNumber: 'TPH-20260821-000001',
      orderDate: '2026-08-21T10:00:00Z',
      customerName: 'Test Customer',
      deliveryAddress: ['Test address', 'Bengaluru, Karnataka 560087'],
      subtotalPaise: 10000,
      discountPaise: 1000,
      deliveryFeePaise: 500,
      totalPaise: 9500,
      lines: [{ product_name: 'Brass Diya', sku: 'B001', unit_label: '1 piece', unit_price_paise: 10000, quantity: 1, line_total_paise: 10000 }],
    });
    const pdf = new TextDecoder().decode(pdfBytes);
    expect(new TextDecoder().decode(pdfBytes.slice(0, 8)).startsWith('%PDF-')).toBe(true);
    const document = await PDFDocument.load(pdfBytes);
    expect(document.getTitle()).toBe('TPH-20260821-000001 invoice');
    expect(document.getSubject()).toBe('Cash on Delivery order invoice');
    expect(document.getPageCount()).toBeGreaterThan(0);
    expect(pdf).not.toContain('tracking_token');
  });

  it('requires a valid tracking hash, customer ownership, or active admin authorization', () => {
    expect(source).toContain('constantTimeEqualHex');
    expect(source).toContain('isTrackingTokenCurrent');
    expect(source).toContain('order.customer_id === user.id');
    expect(source).toContain('profile?.is_active');
    expect(source).toContain("isOriginAllowed(origin, 'shared')");
  });

  it('paginates long orders instead of allowing item rows to overlap totals', async () => {
    const lines = Array.from({ length: 35 }, (_, index) => ({
      product_name: `Pooja essential item with a descriptive product name ${index + 1}`,
      sku: `SKU${String(index + 1).padStart(3, '0')}`,
      unit_label: '1 pack',
      unit_price_paise: 10000,
      quantity: 1,
      line_total_paise: 10000,
    }));
    const bytes = await buildInvoicePdf({ storeName: 'The Pooja House', storeContact: '', orderNumber: 'TPH-20260821-000002', orderDate: '2026-08-21T10:00:00Z', customerName: 'Test Customer', subtotalPaise: 350000, discountPaise: 0, deliveryFeePaise: 0, totalPaise: 350000, lines });
    const document = await PDFDocument.load(bytes);
    expect(document.getPageCount()).toBeGreaterThan(1);
  });

  it('returns a private non-sniffable PDF and contains no WhatsApp integration', () => {
    expect(source).toContain("'Content-Type': 'application/pdf'");
    expect(source).toContain("'Cache-Control': 'private, no-store, max-age=0'");
    expect(source).toContain("'X-Content-Type-Options': 'nosniff'");
    expect(source).not.toMatch(/whatsapp|graph\.facebook|META_ACCESS_TOKEN/i);
  });
});
