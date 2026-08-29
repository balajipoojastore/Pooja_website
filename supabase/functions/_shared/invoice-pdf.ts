import { PDFDocument, PageSizes, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

export interface InvoiceLine {
  product_name: string;
  sku: string;
  unit_label: string;
  unit_price_paise: number;
  quantity: number;
  line_total_paise: number;
}

export interface InvoiceData {
  storeName: string;
  storeContact: string;
  orderNumber: string;
  orderDate: string;
  customerName: string;
  customerPhone?: string;
  deliveryAddress?: string[];
  orderStatus?: string;
  subtotalPaise: number;
  discountPaise: number;
  deliveryFeePaise: number;
  totalPaise: number;
  lines: InvoiceLine[];
}

const palette = {
  orange: rgb(0.976, 0.451, 0.086),
  orangeDark: rgb(0.769, 0.243, 0.047),
  cream: rgb(1, 0.973, 0.945),
  ink: rgb(0.122, 0.161, 0.216),
  muted: rgb(0.392, 0.455, 0.545),
  line: rgb(0.898, 0.906, 0.922),
  white: rgb(1, 1, 1),
  row: rgb(0.985, 0.987, 0.991),
  success: rgb(0.082, 0.502, 0.235),
};

const money = (paise: number) => `INR ${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const safeText = (value: unknown) => String(value ?? '').normalize('NFKD').replace(/[^\x20-\x7E]/g, '').replace(/\s+/g, ' ').trim();

function fitText(text: string, font: PDFFont, size: number, maxWidth: number): string {
  const safe = safeText(text);
  if (font.widthOfTextAtSize(safe, size) <= maxWidth) return safe;
  let fitted = safe;
  while (fitted.length && font.widthOfTextAtSize(`${fitted}...`, size) > maxWidth) fitted = fitted.slice(0, -1);
  return `${fitted.trimEnd()}...`;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number, maxLines = 2): string[] {
  const words = safeText(text).split(' ').filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (!lines.length) lines.push('Item');
  if (words.join(' ') !== lines.join(' ')) lines[lines.length - 1] = fitText(lines[lines.length - 1], font, size, maxWidth);
  return lines;
}

function drawRight(page: PDFPage, text: string, right: number, y: number, font: PDFFont, size: number, color = palette.ink) {
  const safe = safeText(text);
  page.drawText(safe, { x: right - font.widthOfTextAtSize(safe, size), y, size, font, color });
}

function drawLabelValue(page: PDFPage, label: string, value: string, x: number, y: number, width: number, regular: PDFFont, bold: PDFFont) {
  page.drawText(label.toUpperCase(), { x, y, size: 7, font: bold, color: palette.muted });
  page.drawText(fitText(value, regular, 9.5, width), { x, y: y - 15, size: 9.5, font: regular, color: palette.ink });
}

function drawTableHeader(page: PDFPage, y: number, bold: PDFFont) {
  page.drawRectangle({ x: 36, y: y - 26, width: 523, height: 26, color: palette.ink });
  page.drawText('PRODUCT', { x: 46, y: y - 17, size: 7.5, font: bold, color: palette.white });
  page.drawText('SKU', { x: 274, y: y - 17, size: 7.5, font: bold, color: palette.white });
  page.drawText('QTY', { x: 350, y: y - 17, size: 7.5, font: bold, color: palette.white });
  drawRight(page, 'UNIT PRICE', 463, y - 17, bold, 7.5, palette.white);
  drawRight(page, 'AMOUNT', 549, y - 17, bold, 7.5, palette.white);
  return y - 26;
}

function drawPrimaryHeader(page: PDFPage, data: InvoiceData, regular: PDFFont, bold: PDFFont) {
  const { height } = page.getSize();
  page.drawRectangle({ x: 0, y: height - 108, width: 595.28, height: 108, color: palette.orange });
  page.drawCircle({ x: 58, y: height - 54, size: 23, color: palette.white, opacity: 0.18 });
  page.drawText('P', { x: 49.5, y: height - 64, size: 28, font: bold, color: palette.white });
  page.drawText(fitText(data.storeName || 'The Pooja House', bold, 20, 280), { x: 91, y: height - 49, size: 20, font: bold, color: palette.white });
  page.drawText('POOJA ESSENTIALS, DELIVERED', { x: 92, y: height - 68, size: 7.5, font: bold, color: palette.cream });
  page.drawText('ORDER INVOICE', { x: 417, y: height - 44, size: 14, font: bold, color: palette.white });
  page.drawText('CASH ON DELIVERY', { x: 435, y: height - 64, size: 7.5, font: bold, color: palette.cream });

  page.drawRectangle({ x: 36, y: height - 220, width: 523, height: 88, color: palette.cream, borderColor: palette.line, borderWidth: 0.7 });
  page.drawLine({ start: { x: 298, y: height - 208 }, end: { x: 298, y: height - 144 }, color: palette.line, thickness: 0.8 });
  drawLabelValue(page, 'Invoice number', data.orderNumber, 50, height - 156, 225, regular, bold);
  drawLabelValue(page, 'Order date', new Date(data.orderDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }), 50, height - 194, 225, regular, bold);
  drawLabelValue(page, 'Customer', data.customerName, 314, height - 156, 220, regular, bold);
  drawLabelValue(page, 'Contact', data.customerPhone || 'Not provided', 314, height - 194, 220, regular, bold);

  page.drawText('DELIVERY ADDRESS', { x: 42, y: height - 247, size: 7.5, font: bold, color: palette.orangeDark });
  const addressLines = (data.deliveryAddress ?? []).flatMap((line) => wrapText(line, regular, 9, 505, 2)).slice(0, 3);
  addressLines.forEach((line, index) => page.drawText(line, { x: 42, y: height - 265 - index * 13, size: 9, font: regular, color: palette.ink }));
  return height - 310;
}

function drawContinuationHeader(page: PDFPage, data: InvoiceData, bold: PDFFont) {
  const { height } = page.getSize();
  page.drawRectangle({ x: 0, y: height - 58, width: 595.28, height: 58, color: palette.orange });
  page.drawText(fitText(data.storeName || 'The Pooja House', bold, 15, 300), { x: 36, y: height - 36, size: 15, font: bold, color: palette.white });
  drawRight(page, `${data.orderNumber}  |  CONTINUED`, 559, height - 34, bold, 8, palette.white);
  return height - 82;
}

export async function buildInvoicePdf(data: InvoiceData): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  document.setTitle(`${data.orderNumber} invoice`);
  document.setAuthor(data.storeName || 'The Pooja House');
  document.setSubject('Cash on Delivery order invoice');
  document.setCreator('The Pooja House secure invoice service');
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  let page = document.addPage(PageSizes.A4);
  let y = drawPrimaryHeader(page, data, regular, bold);
  y = drawTableHeader(page, y, bold);

  for (let index = 0; index < data.lines.length; index += 1) {
    const item = data.lines[index];
    const productLines = wrapText(item.product_name, bold, 9.5, 210, 2);
    const rowHeight = Math.max(43, 17 + productLines.length * 11);
    if (y - rowHeight < 165) {
      page = document.addPage(PageSizes.A4);
      y = drawContinuationHeader(page, data, bold);
      y = drawTableHeader(page, y, bold);
    }
    if (index % 2 === 1) page.drawRectangle({ x: 36, y: y - rowHeight, width: 523, height: rowHeight, color: palette.row });
    page.drawLine({ start: { x: 36, y: y - rowHeight }, end: { x: 559, y: y - rowHeight }, color: palette.line, thickness: 0.6 });
    productLines.forEach((line, lineIndex) => page.drawText(line, { x: 46, y: y - 15 - lineIndex * 11, size: 9.5, font: bold, color: palette.ink }));
    page.drawText(fitText(item.unit_label || 'Unit', regular, 7.5, 210), { x: 46, y: y - rowHeight + 8, size: 7.5, font: regular, color: palette.muted });
    page.drawText(fitText(item.sku, regular, 8.5, 64), { x: 274, y: y - 23, size: 8.5, font: regular, color: palette.ink });
    drawRight(page, String(item.quantity), 373, y - 23, bold, 9);
    drawRight(page, money(item.unit_price_paise), 463, y - 23, regular, 8.5);
    drawRight(page, money(item.line_total_paise), 549, y - 23, bold, 8.5);
    y -= rowHeight;
  }

  if (y < 205) {
    page = document.addPage(PageSizes.A4);
    y = drawContinuationHeader(page, data, bold);
  }
  const totalsTop = y - 20;
  page.drawRectangle({ x: 326, y: totalsTop - 126, width: 233, height: 126, color: palette.cream, borderColor: palette.line, borderWidth: 0.8 });
  page.drawText('ORDER TOTAL', { x: 340, y: totalsTop - 19, size: 8, font: bold, color: palette.orangeDark });
  const totals = [
    ['Subtotal', money(data.subtotalPaise)],
    ['Discount', data.discountPaise ? `- ${money(data.discountPaise)}` : money(0)],
    ['Delivery fee', money(data.deliveryFeePaise)],
  ];
  totals.forEach(([label, value], index) => {
    const lineY = totalsTop - 42 - index * 20;
    page.drawText(label, { x: 340, y: lineY, size: 8.5, font: regular, color: palette.muted });
    drawRight(page, value, 545, lineY, regular, 8.5);
  });
  page.drawRectangle({ x: 326, y: totalsTop - 126, width: 233, height: 31, color: palette.orange });
  page.drawText('AMOUNT DUE', { x: 340, y: totalsTop - 115, size: 9, font: bold, color: palette.white });
  drawRight(page, money(data.totalPaise), 545, totalsTop - 115, bold, 10.5, palette.white);

  page.drawRectangle({ x: 36, y: totalsTop - 126, width: 272, height: 126, color: palette.row, borderColor: palette.line, borderWidth: 0.8 });
  page.drawText('PAYMENT METHOD', { x: 50, y: totalsTop - 25, size: 7.5, font: bold, color: palette.muted });
  page.drawText('Cash on Delivery', { x: 50, y: totalsTop - 51, size: 14, font: bold, color: palette.ink });
  page.drawText('Pay the amount due when your order arrives.', { x: 50, y: totalsTop - 72, size: 8, font: regular, color: palette.muted });
  page.drawRectangle({ x: 50, y: totalsTop - 108, width: 62, height: 22, color: palette.white, borderColor: palette.line, borderWidth: 0.7 });
  page.drawCircle({ x: 64, y: totalsTop - 97, size: 5, color: palette.success });
  page.drawText('COD', { x: 75, y: totalsTop - 100, size: 7.5, font: bold, color: palette.success });

  const pages = document.getPages();
  pages.forEach((current, index) => {
    current.drawLine({ start: { x: 36, y: 42 }, end: { x: 559, y: 42 }, color: palette.line, thickness: 0.7 });
    current.drawText(fitText(data.storeContact || 'Thank you for shopping with The Pooja House.', regular, 7.5, 420), { x: 36, y: 25, size: 7.5, font: regular, color: palette.muted });
    drawRight(current, `Page ${index + 1} of ${pages.length}`, 559, 25, regular, 7.5, palette.muted);
  });

  return document.save({ useObjectStreams: false, addDefaultPage: false });
}
