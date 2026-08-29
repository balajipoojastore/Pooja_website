export interface CatalogValidationRow {
  sku: string;
  productName: string;
  excelWorksheet: string;
  websiteCategory: string;
  excelRowNumber: number;
  mrpPaise: number | null;
  sellingPricePaise: number | null;
  unitType: string;
  unitLabel: string;
  inStock: boolean | null;
  originalImagePath: string | null;
  appliedOverride: string | null;
  matchedImage: string | null;
  imageExtension: string | null;
  imageSize: number | null;
  imageWidth: number | null;
  imageHeight: number | null;
  validationStatus: 'valid' | 'invalid' | 'skipped';
  warningError: string;
  publicationStatus: 'published' | 'unpublished' | 'skipped';
  importStatus: string;
  supabaseStoragePath: string | null;
}
