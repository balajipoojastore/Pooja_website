import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { duplicateSkus, exactSkuForImage, importCatalog, isBlankProductRow, normalizeHeader, rupeesToPaise, validateCatalog } from './import-catalog';

describe('catalog normalization', () => {
  it('normalizes inconsistent workbook headers and exact integer money', () => {
    expect(normalizeHeader(' MRP price ')).toBe('mrp_price');
    expect(normalizeHeader('Dis price')).toBe('dis_price');
    expect(rupeesToPaise('₹1,299.50')).toBe(129950);
    expect(rupeesToPaise('12.345')).toBeNull();
  });
  it('identifies blank rows and duplicate SKUs', () => {
    expect(isBlankProductRow(['', ' ', null])).toBe(true);
    expect([...duplicateSkus([{ sku: 'A001' }, { sku: 'A001' }, { sku: 'B001' }])]).toEqual(['A001']);
  });
  it('applies path-specific overrides and never partial-matches SKU stems', () => {
    const overrides = { 'Agarbatti/L005.jpg': 'A005' };
    expect(exactSkuForImage('L005', overrides, 'Agarbatti/L005.jpg')).toEqual({ sku: 'A005', appliedOverride: 'Agarbatti/L005.jpg → A005' });
    expect(exactSkuForImage('A001-extra', overrides, 'Agarbatti/A001-extra.jpg').sku).toBeNull();
    expect(exactSkuForImage('A001', overrides, 'Agarbatti/A001.jpg').sku).toBe('A001');
  });
});

describe('real catalog validation', () => {
  it('selects the eight approved categories and reproduces the current image and pricing inventory', async () => {
    const root = path.resolve('.');
    const result = await validateCatalog({ operation: 'validate', workbook: path.join(root, 'catalog/pooja_store_catalog_template (1).xlsx'), imagesDir: path.join(root, 'catalog/images'), reportsDir: path.join(root, 'reports') });
    expect(result.summary.categoriesSelected).toBe(8);
    expect(result.summary.completeProducts).toBe(231);
    expect(result.summary.imagesScanned).toBe(240);
    expect(result.summary.exactImageMatches).toBe(224);
    expect(result.summary.overrideMatches).toBe(3);
    expect(result.summary.missingImages).toBe(4);
    expect(result.summary.orphanImages).toBe(13);
    expect(result.summary.invalidPrices).toBe(1);
    expect(result.rows.filter((row) => row.publicationStatus === 'unpublished').map((row) => row.sku).sort()).toEqual(['A005', 'A020', 'D018', 'K023', 'L007']);
    expect(result.rows.find((row) => row.sku === 'K017')?.imageExtension).toBe('.webp');
    expect(result.rows.find((row) => row.sku === 'K029')?.imageExtension).toBe('.avif');
    expect(result.rows.find((row) => row.sku === 'O004')?.publicationStatus).toBe('published');
  }, 60_000);

  it('can isolate the Camphor and Havan incremental import', async () => {
    const root = path.resolve('.');
    const result = await validateCatalog({
      operation: 'validate',
      workbook: path.join(root, 'catalog/pooja_store_catalog_template (1).xlsx'),
      imagesDir: path.join(root, 'catalog/images'),
      reportsDir: path.join(root, 'reports'),
      worksheets: ['Camphor & Matches', 'Havan Samagri'],
    });
    expect(result.summary.categoriesSelected).toBe(2);
    expect(result.summary.productRowsEvaluated).toBe(45);
    expect(result.summary.completeProducts).toBe(41);
    expect(result.summary.validProducts).toBe(41);
    expect(result.summary.imagesScanned).toBe(43);
    expect(result.summary.exactImageMatches).toBe(41);
    expect(result.summary.orphanImages).toBe(2);
    expect(result.summary.skippedProducts).toBe(4);
    expect(result.rows.filter((row) => row.validationStatus === 'skipped').map((row) => row.sku)).toEqual(['H001', 'H002', 'S013', 'S014']);
  }, 60_000);

  it('uses stable upsert keys and storage paths across repeated imports', async () => {
    const categoryRecords = new Map<string, any>(); const productRecords = new Map<string, any>(); const uploads = new Set<string>();
    const fakeClient = {
      from(table: string) { return { upsert(payload: any) { const records = table === 'categories' ? categoryRecords : productRecords; const key = table === 'categories' ? payload.slug : payload.sku; records.set(key, payload); return { select() { return { single: async () => ({ data: { id: `${table}-${key}` }, error: null }) }; } }; } }; },
      storage: { from() { return { upload: async (storagePath: string) => { uploads.add(storagePath); return { error: null }; } }; } },
    } as any;
    const imagePath = path.resolve('catalog/images/Agarbatti/A001.jpg');
    const result: any = { rows: [{ sku:'A001',productName:'Cycle Agarbatti 3in1',excelWorksheet:'Agarbatti & Dhoop',websiteCategory:'Agarbatti & Dhoop',excelRowNumber:2,mrpPaise:5500,sellingPricePaise:4900,unitType:'pack',unitLabel:'86g',inStock:true,matchedImage:imagePath,supabaseStoragePath:'products/A001/stable-a001.jpg',validationStatus:'valid',publicationStatus:'published',warningError:'',importStatus:'not imported' }], images:[{ absolutePath:imagePath,extension:'.jpg' }], orphanImages:[], selectedMappings: [['Agarbatti & Dhoop', { category: 'Agarbatti & Dhoop', slug: 'agarbatti-dhoop', folder: 'Agarbatti' }]], summary:{ importedProducts:0,uploadFailures:0 } };
    await importCatalog(result, fakeClient); await importCatalog(result, fakeClient);
    expect(categoryRecords.size).toBe(1); expect(productRecords.size).toBe(1); expect(uploads.size).toBe(1);
  });
});
