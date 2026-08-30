import ExcelJS from 'exceljs';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const WORKSHEET_MAP = new Map<string, { category: string; slug: string; folder: string }>([
  ['Agarbatti & Dhoop', { category: 'Agarbatti & Dhoop', slug: 'agarbatti-dhoop', folder: 'Agarbatti' }],
  ['Brass Items', { category: 'Brass Items', slug: 'brass-items', folder: 'Brass' }],
  ['Lakshmi Items', { category: 'Lakshmi Items', slug: 'lakshmi-items', folder: 'Lakshmi items' }],
  ['Diyas & Wicks', { category: 'Diyas & Wicks', slug: 'diyas-wicks', folder: 'Mud Items' }],
  ['Kumkum Haldi Chandan', { category: 'Kumkum Haldi Chandan', slug: 'kumkum-haldi-chandan', folder: 'Kumkum Haldi Chandan' }],
  ['Oils & Ghee', { category: 'Oils & Ghee', slug: 'oils-ghee', folder: 'Oils & Ghee' }],
  ['Camphor & Matches', { category: 'Camphor & Matches', slug: 'camphor-matches', folder: 'Camphor & Matches' }],
  ['Havan Samagri', { category: 'Havan Samagri', slug: 'havan-samagri', folder: 'Havan Samagri' }],
] as const);

const VALID_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);
const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export interface CatalogRow {
  sku: string; productName: string; excelWorksheet: string; websiteCategory: string; excelRowNumber: number;
  mrpPaise: number | null; sellingPricePaise: number | null; unitType: string; unitLabel: string; inStock: boolean | null;
  originalImagePath: string | null; appliedOverride: string | null; matchedImage: string | null; imageExtension: string | null;
  imageSize: number | null; imageWidth: number | null; imageHeight: number | null;
  validationStatus: 'valid' | 'invalid' | 'skipped'; warningError: string;
  publicationStatus: 'published' | 'unpublished' | 'skipped'; importStatus: string; supabaseStoragePath: string | null;
}

interface ScannedImage { absolutePath: string; relativePath: string; normalizedRelative: string; folder: string | null; stem: string; extension: string; size: number; width: number | null; height: number | null; readable: boolean; error?: string; overrideSku?: string }
interface Options {
  operation: 'validate' | 'import';
  workbook: string;
  imagesDir: string;
  reportsDir: string;
  worksheets?: string[];
}

export const normalizeHeader = (value: unknown): string => String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

export function rupeesToPaise(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const normalized = String(value).replace(/[₹,\s]/g, '');
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [whole = '0', fraction = ''] = normalized.split('.');
  const result = Number.parseInt(whole, 10) * 100 + Number.parseInt(fraction.padEnd(2, '0') || '0', 10);
  return Number.isSafeInteger(result) ? result : null;
}

export function isBlankProductRow(values: unknown[]): boolean { return values.every((value) => String(value ?? '').trim() === ''); }

export function exactSkuForImage(stem: string, overrides: Record<string, string>, normalizedRelativePath: string): { sku: string | null; appliedOverride: string | null } {
  const overrideEntry = Object.entries(overrides).find(([source]) => normalizedRelativePath.toLowerCase().endsWith(source.replace(/\\/g, '/').toLowerCase()));
  if (overrideEntry) return { sku: overrideEntry[1]!.trim().toUpperCase(), appliedOverride: `${overrideEntry[0]} → ${overrideEntry[1]}` };
  const candidate = stem.trim().toUpperCase();
  return /^[A-Z]+\d+$/.test(candidate) ? { sku: candidate, appliedOverride: null } : { sku: null, appliedOverride: null };
}

export function duplicateSkus(rows: Pick<CatalogRow, 'sku'>[]): Set<string> {
  const seen = new Set<string>(); const duplicates = new Set<string>();
  for (const row of rows) { if (seen.has(row.sku)) duplicates.add(row.sku); else seen.add(row.sku); }
  return duplicates;
}

function cellText(cell: ExcelJS.Cell): string {
  return cell.text.replace(/\s+/g, ' ').trim();
}

async function scanImages(imagesDir: string, overrides: Record<string, string>): Promise<ScannedImage[]> {
  const files: string[] = [];
  async function walk(directory: string) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) files.push(full);
    }
  }
  await walk(imagesDir);
  return Promise.all(files.sort().map(async (absolutePath) => {
    const relativePath = path.relative(imagesDir, absolutePath);
    const normalizedRelative = relativePath.replace(/\\/g, '/');
    const segments = normalizedRelative.split('/');
    const folder = [...WORKSHEET_MAP.values()].find((item) => segments.some((segment) => segment.toLowerCase() === item.folder.toLowerCase()))?.folder ?? null;
    const details = exactSkuForImage(path.parse(absolutePath).name, overrides, normalizedRelative);
    const info = await stat(absolutePath);
    const extension = path.extname(absolutePath).toLowerCase();
    if (!VALID_EXTENSIONS.has(extension)) {
      return { absolutePath, relativePath, normalizedRelative, folder, stem: path.parse(absolutePath).name, extension, size: info.size, width: null, height: null, readable: false, error: `Unsupported file type: ${extension || 'none'}`, overrideSku: details.sku ?? undefined };
    }
    try {
      const metadata = await sharp(absolutePath, { failOn: 'error' }).metadata();
      return { absolutePath, relativePath, normalizedRelative, folder, stem: path.parse(absolutePath).name, extension, size: info.size, width: metadata.width ?? null, height: metadata.height ?? null, readable: Boolean(metadata.width && metadata.height), overrideSku: details.sku ?? undefined };
    } catch (error) {
      return { absolutePath, relativePath, normalizedRelative, folder, stem: path.parse(absolutePath).name, extension, size: info.size, width: null, height: null, readable: false, error: error instanceof Error ? error.message : 'Unreadable image', overrideSku: details.sku ?? undefined };
    }
  }));
}

export async function validateCatalog(options: Options) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(options.workbook);
  const overrides = JSON.parse(await readFile(path.join(PROJECT_ROOT, 'catalog', 'image-overrides.json'), 'utf8')) as Record<string, string>;
  const selectedWorksheetNames = options.worksheets?.length ? options.worksheets : [...WORKSHEET_MAP.keys()];
  const unknownWorksheets = selectedWorksheetNames.filter((worksheet) => !WORKSHEET_MAP.has(worksheet));
  if (unknownWorksheets.length) throw new Error(`Unknown worksheet selection: ${unknownWorksheets.join(', ')}`);
  const selectedMappings = selectedWorksheetNames.map((worksheet) => [worksheet, WORKSHEET_MAP.get(worksheet)!] as const);
  const selectedFolders = new Set(selectedMappings.map(([, mapping]) => mapping.folder.toLowerCase()));
  const allImages = await scanImages(options.imagesDir, overrides);
  const images = options.worksheets?.length
    ? allImages.filter((image) => image.folder && selectedFolders.has(image.folder.toLowerCase()))
    : allImages;
  const imageByCategorySku = new Map<string, ScannedImage[]>();
  for (const image of images) {
    const matchInfo = exactSkuForImage(image.stem, overrides, image.normalizedRelative);
    if (!image.folder || !matchInfo.sku) continue;
    const key = `${image.folder.toLowerCase()}::${matchInfo.sku}`;
    imageByCategorySku.set(key, [...(imageByCategorySku.get(key) ?? []), { ...image, overrideSku: matchInfo.sku }]);
  }
  const rows: CatalogRow[] = [];
  const worksheetsScanned: string[] = [];
  for (const [worksheetName, mapping] of selectedMappings) {
    const sheet = workbook.getWorksheet(worksheetName);
    if (!sheet) throw new Error(`Required worksheet is missing: ${worksheetName}`);
    worksheetsScanned.push(worksheetName);
    const headers = Array.from({ length: 7 }, (_, index) => normalizeHeader(cellText(sheet.getCell(1, index + 1))));
    if (headers[0] !== 'item_no' || headers[1] !== 'item_name' || !['price', 'mrp_price', 'pricemrp'].includes(headers[4]!)) throw new Error(`Unexpected header layout in ${worksheetName}: ${headers.join(', ')}`);
    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
      const cells = Array.from({ length: 7 }, (_, index) => sheet.getCell(rowNumber, index + 1));
      const texts = cells.map(cellText);
      if (isBlankProductRow(texts)) continue;
      const [rawSku = '', rawName = '', unitType = '', unitLabel = '', rawMrp = '', rawStock = '', rawDiscount = ''] = texts;
      const sku = rawSku.trim().toUpperCase(); const productName = rawName.trim();
      if (!sku) continue; // section heading such as Dhoop/Bhathi
      const mrpPaise = rupeesToPaise(cells[4]!.value ?? rawMrp);
      const discounted = rupeesToPaise(cells[6]!.value ?? rawDiscount);
      const sellingPricePaise = discounted && discounted > 0 ? discounted : mrpPaise;
      const inStock = /^yes$/i.test(rawStock) ? true : /^no$/i.test(rawStock) ? false : null;
      const warnings: string[] = [];
      const incomplete = !productName || !unitType || !unitLabel || mrpPaise === null || mrpPaise <= 0 || inStock === null;
      if (incomplete) warnings.push('Incomplete placeholder row; required product data is missing.');
      if (sellingPricePaise !== null && mrpPaise !== null && sellingPricePaise > mrpPaise) warnings.push(`Invalid price: selling price ₹${(sellingPricePaise / 100).toFixed(2)} exceeds MRP ₹${(mrpPaise / 100).toFixed(2)}.`);
      const key = `${mapping.folder.toLowerCase()}::${sku}`;
      const matches = imageByCategorySku.get(key) ?? [];
      if (!matches.length && !incomplete) warnings.push('No exact SKU image match.');
      if (matches.length > 1) warnings.push(`Duplicate primary images: ${matches.map((item) => item.relativePath).join(', ')}.`);
      const match = matches[0];
      if (match && !match.readable) warnings.push(`Image unreadable: ${match.error}`);
      if (match && match.size > 5 * 1024 * 1024) warnings.push('Image exceeds the 5 MB Storage limit.');
      const overrideInfo = match ? exactSkuForImage(match.stem, overrides, match.normalizedRelative) : null;
      const invalidPrice = sellingPricePaise !== null && mrpPaise !== null && sellingPricePaise > mrpPaise;
      const invalid = incomplete || invalidPrice || matches.length > 1 || Boolean(match && (!match.readable || match.size > 5 * 1024 * 1024));
      const publish = !invalid && Boolean(match) && inStock === true;
      rows.push({ sku, productName, excelWorksheet: worksheetName, websiteCategory: mapping.category, excelRowNumber: rowNumber, mrpPaise, sellingPricePaise, unitType, unitLabel, inStock, originalImagePath: match?.absolutePath ?? null, appliedOverride: overrideInfo?.appliedOverride ?? null, matchedImage: match?.absolutePath ?? null, imageExtension: match?.extension ?? null, imageSize: match?.size ?? null, imageWidth: match?.width ?? null, imageHeight: match?.height ?? null, validationStatus: incomplete ? 'skipped' : invalid ? 'invalid' : 'valid', warningError: warnings.join(' '), publicationStatus: incomplete ? 'skipped' : publish ? 'published' : 'unpublished', importStatus: 'not imported', supabaseStoragePath: match ? storagePathFor(sku, match) : null });
    }
  }
  const duplicates = duplicateSkus(rows.filter((row) => row.validationStatus !== 'skipped'));
  for (const row of rows) if (duplicates.has(row.sku)) { row.validationStatus = 'invalid'; row.publicationStatus = 'unpublished'; row.warningError = `${row.warningError} Duplicate SKU in selected worksheets.`.trim(); }
  const productSkuFolders = new Set(rows.filter((row) => row.validationStatus !== 'skipped').map((row) => `${WORKSHEET_MAP.get(row.excelWorksheet)!.folder.toLowerCase()}::${row.sku}`));
  const orphanImages = images.filter((image) => {
    const sku = exactSkuForImage(image.stem, overrides, image.normalizedRelative).sku;
    return !image.folder || !sku || !productSkuFolders.has(`${image.folder.toLowerCase()}::${sku}`);
  });
  const unexpectedFolders = [...new Set(images.filter((image) => !image.folder).map((image) => image.relativePath.split(/[\\/]/)[0]))];
  const completeRows = rows.filter((row) => row.validationStatus !== 'skipped');
  const summary = {
    worksheetsScanned, categoriesSelected: selectedMappings.length, productRowsEvaluated: rows.length,
    completeProducts: completeRows.length, validProducts: completeRows.filter((row) => row.validationStatus === 'valid').length,
    invalidProducts: completeRows.filter((row) => row.validationStatus === 'invalid').length,
    imagesScanned: images.length, exactImageMatches: completeRows.filter((row) => row.matchedImage && !row.appliedOverride).length,
    overrideMatches: completeRows.filter((row) => row.appliedOverride).length, missingImages: completeRows.filter((row) => !row.matchedImage).length,
    orphanImages: orphanImages.length, duplicateImages: completeRows.filter((row) => row.warningError.includes('Duplicate primary')).length,
    duplicateSkus: duplicates.size, invalidPrices: completeRows.filter((row) => row.warningError.includes('Invalid price')).length,
    unexpectedFolders, importedProducts: 0, unpublishedProducts: completeRows.filter((row) => row.publicationStatus === 'unpublished').length,
    skippedProducts: rows.filter((row) => row.validationStatus === 'skipped').length, uploadFailures: 0,
  };
  return { rows, summary, images, orphanImages, selectedMappings };
}

function storagePathFor(sku: string, image: ScannedImage): string {
  const digest = createHash('sha256').update(`${image.normalizedRelative}:${image.size}`).digest('hex').slice(0, 12);
  const sourceFile = path.basename(image.absolutePath).toLowerCase().replace(/[^a-z0-9.]+/g, '-');
  const file = image.extension === '.avif' ? sourceFile.replace(/\.avif$/i, '.webp') : sourceFile;
  return `products/${sku}/${digest}-${file}`;
}

function slugify(value: string) { return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100); }

async function uploadImage(client: SupabaseClient, image: ScannedImage, storagePath: string) {
  const sourceBytes = await readFile(image.absolutePath);
  // The Storage bucket intentionally has a conservative image MIME allowlist.
  // Convert AVIF only for the uploaded derivative; never modify the source file.
  const bytes = image.extension === '.avif'
    ? await sharp(sourceBytes).webp({ quality: 90 }).toBuffer()
    : sourceBytes;
  const contentType = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.avif': 'image/webp',
  }[image.extension] ?? 'application/octet-stream';
  const { error } = await client.storage.from('products').upload(storagePath, bytes, { upsert: true, contentType });
  if (error) throw error;
}

export async function importCatalog(result: Awaited<ReturnType<typeof validateCatalog>>, client: SupabaseClient) {
  const categoryIds = new Map<string, string>();
  for (const [worksheet, mapping] of result.selectedMappings) {
    const { data, error } = await client.from('categories').upsert({ name: mapping.category, slug: mapping.slug, description: `Imported from ${worksheet}.`, is_active: true, sort_order: [...WORKSHEET_MAP.keys()].indexOf(worksheet) * 10 + 10 }, { onConflict: 'slug' }).select('id').single();
    if (error) throw new Error(`Category ${mapping.category}: ${error.message}`);
    categoryIds.set(mapping.category, data.id);
  }
  let imported = 0; let uploadFailures = 0;
  const seenForRun = new Set<string>();
  for (const row of result.rows) {
    if (row.validationStatus === 'skipped' || row.warningError.includes('Duplicate SKU') || seenForRun.has(row.sku)) { row.importStatus = 'skipped'; continue; }
    seenForRun.add(row.sku);
    let imageReady = false;
    if (row.matchedImage && row.supabaseStoragePath) {
      const image = result.images.find((item) => item.absolutePath === row.matchedImage)!;
      try { await uploadImage(client, image, row.supabaseStoragePath); imageReady = true; }
      catch (error) { uploadFailures += 1; row.warningError = `${row.warningError} Upload failed: ${error instanceof Error ? error.message : 'unknown error'}`.trim(); }
    }
    const invalidPrice = row.sellingPricePaise !== null && row.mrpPaise !== null && row.sellingPricePaise > row.mrpPaise;
    const safePrice = invalidPrice ? 0 : row.sellingPricePaise;
    const sortOrder = row.excelRowNumber;
    const { data, error } = await client.from('products').upsert({
      category_id: categoryIds.get(row.websiteCategory), sku: row.sku, name: row.productName,
      slug: `${slugify(row.productName)}-${row.sku.toLowerCase()}`, unit_type: row.unitType, unit_label: row.unitLabel,
      short_description: `${row.websiteCategory} for daily rituals and celebrations.`, description: `${row.productName}, thoughtfully sourced by The Pooja House.`,
      mrp_paise: row.mrpPaise, price_paise: safePrice, primary_image_path: imageReady ? row.supabaseStoragePath : null,
      in_stock: row.inStock ?? false, stock_status: row.inStock ? 'In stock' : 'Out of stock', delivery_label: 'Delivery in 1–3 days',
      is_popular: sortOrder % 5 === 0, is_best_seller: sortOrder % 7 === 0, is_recommended: sortOrder % 3 === 0,
      is_festival_product: row.websiteCategory === 'Diyas & Wicks',
      is_published: row.publicationStatus === 'published' && imageReady && !invalidPrice, sort_order: sortOrder,
    }, { onConflict: 'sku' }).select('id').single();
    if (error) { row.importStatus = `failed: ${error.message}`; continue; }
    if (invalidPrice) await client.from('catalog_import_issues').upsert({ product_id: data.id, sku: row.sku, issue_code: 'selling_price_exceeds_mrp', source_payload: { mrp_paise: row.mrpPaise, selling_price_paise: row.sellingPricePaise, worksheet: row.excelWorksheet, row: row.excelRowNumber }, resolved_at: null }, { onConflict: 'sku,issue_code' });
    row.importStatus = 'imported'; imported += 1;
  }
  result.summary.importedProducts = imported; result.summary.uploadFailures = uploadFailures;
}

function csvValue(value: unknown): string { const text = value === null || value === undefined ? '' : String(value); return `"${text.replace(/"/g, '""')}"`; }
async function writeReports(result: Awaited<ReturnType<typeof validateCatalog>>, directory: string) {
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, 'catalog-validation.json'), `${JSON.stringify(result.rows, null, 2)}\n`, 'utf8');
  const headers = Object.keys(result.rows[0] ?? {});
  const csv = [headers.map(csvValue).join(','), ...result.rows.map((row) => headers.map((header) => csvValue((row as any)[header])).join(','))].join('\n');
  await writeFile(path.join(directory, 'catalog-validation.csv'), `${csv}\n`, 'utf8');
  await writeFile(path.join(directory, 'catalog-summary.json'), `${JSON.stringify({ ...result.summary, orphanImagePaths: result.orphanImages.map((image) => image.relativePath) }, null, 2)}\n`, 'utf8');
}

function parseOptions(argv: string[]): Options {
  const operation = argv[0] === 'import' ? 'import' : 'validate'; const args = new Map<string, string>();
  for (let index = 1; index < argv.length; index += 1) if (argv[index]?.startsWith('--')) args.set(argv[index]!.slice(2), argv[++index] ?? '');
  return {
    operation,
    workbook: path.resolve(args.get('workbook') || process.env.CATALOG_WORKBOOK_PATH || path.join(PROJECT_ROOT, 'catalog', 'pooja_store_catalog_template.xlsx')),
    imagesDir: path.resolve(args.get('images-dir') || process.env.CATALOG_IMAGES_DIR || path.join(PROJECT_ROOT, 'catalog', 'images')),
    reportsDir: path.resolve(args.get('reports-dir') || path.join(PROJECT_ROOT, 'reports')),
    worksheets: args.get('worksheets')?.split(',').map((worksheet) => worksheet.trim()).filter(Boolean),
  };
}

function printSummary(summary: Record<string, unknown>) {
  console.log('\nThe Pooja House catalog report'); console.log('─'.repeat(42));
  for (const [label, value] of Object.entries(summary)) console.log(`${label.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase()).padEnd(29)} ${Array.isArray(value) ? value.join(', ') || 'none' : value}`);
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  await stat(options.workbook); await stat(options.imagesDir);
  console.log(`${options.operation === 'validate' ? 'Validating' : 'Importing'} catalog from ${options.workbook}`);
  const result = await validateCatalog(options);
  if (options.operation === 'import') {
    const url = process.env.SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Catalog import requires server-only SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Validation never requires credentials.');
    await importCatalog(result, createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }));
  }
  await writeReports(result, options.reportsDir); printSummary(result.summary);
  if (result.summary.duplicateSkus || result.summary.duplicateImages || result.summary.unexpectedFolders.length) process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch((error) => { console.error(error instanceof Error ? error.stack : error); process.exitCode = 1; });
