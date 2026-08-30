import localRows from '../../../../reports/catalog-validation.json';
import { ACTIVE_CATEGORIES } from '../lib/constants';
import { isSupabaseConfigured, publicStorageUrl, requireSupabase } from '../lib/supabase';
import type { CatalogValidationRow } from '../types/catalog';
import type { Banner, Category, Product } from '../types/domain';
import { slugify } from '../utils/validation';

export interface ProductFilters {
  search?: string;
  categorySlug?: string;
  inStock?: boolean;
  publishedOnly?: boolean;
  flag?: 'is_popular' | 'is_best_seller' | 'is_recommended' | 'is_festival_product';
}
export interface ProductPage { products: Product[]; total: number; page: number; pageSize: number; }

const categoryByName = new Map<string, Category>(
  ACTIVE_CATEGORIES.map((category, index) => [category.name, {
    id: `local-category-${index + 1}`,
    name: category.name,
    slug: category.slug,
    description: `Explore our ${category.name.toLowerCase()} collection.`,
    image_path: null,
    image_url: null,
    is_active: true,
    sort_order: index,
  } satisfies Category]),
);

function localImageUrl(row: CatalogValidationRow): string | null {
  if (!row.matchedImage) return null;
  const normalized = row.matchedImage.replace(/\\/g, '/');
  const marker = '/catalog/images/';
  const lower = normalized.toLowerCase();
  const index = lower.lastIndexOf(marker);
  const relative = index >= 0 ? normalized.slice(index + marker.length) : normalized.replace(/^.*?images\//i, '');
  return `/${relative.split('/').map(encodeURIComponent).join('/')}`;
}

const localProducts: Product[] = (localRows as CatalogValidationRow[])
  .filter((row) => row.sku && row.validationStatus !== 'skipped' && row.mrpPaise !== null && row.sellingPricePaise !== null)
  .filter((row) => categoryByName.has(row.websiteCategory))
  .map((row, index) => {
    const category = categoryByName.get(row.websiteCategory)!;
    const position = index + 1;
    return {
      id: `local-${row.sku}`,
      category_id: category.id,
      category: { id: category.id, name: category.name, slug: category.slug },
      sku: row.sku,
      name: row.productName,
      slug: `${slugify(row.productName)}-${row.sku.toLowerCase()}`,
      unit_type: row.unitType,
      unit_label: row.unitLabel,
      short_description: `Authentic ${row.websiteCategory.toLowerCase()} selected for your pooja needs.`,
      description: `Bring devotion into everyday rituals with ${row.productName}. Carefully sourced by The Pooja House.`,
      mrp_paise: row.mrpPaise!,
      price_paise: row.sellingPricePaise!,
      primary_image_path: row.supabaseStoragePath,
      image_url: localImageUrl(row),
      in_stock: row.inStock ?? false,
      stock_status: row.inStock ? 'In stock' : 'Out of stock',
      delivery_label: 'Delivery in 1–3 days',
      is_popular: position % 5 === 0 || position <= 8,
      is_best_seller: position % 7 === 0 || position <= 6,
      is_recommended: position % 3 === 0,
      is_festival_product: row.websiteCategory === 'Diyas & Wicks' || position % 11 === 0,
      is_published: row.publicationStatus === 'published',
      sort_order: position,
    };
  });

function hydrateProduct(row: any): Product {
  const category = Array.isArray(row.category) ? row.category[0] : row.category;
  return {
    ...row,
    category,
    image_url: publicStorageUrl('products', row.primary_image_path),
  } as Product;
}

export async function listCategories(includeInactive = false): Promise<Category[]> {
  if (!isSupabaseConfigured) return [...categoryByName.values()];
  let query = requireSupabase().from('categories').select('*').order('sort_order');
  if (!includeInactive) query = query.eq('is_active', true);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((category: any) => ({
    ...category,
    image_url: publicStorageUrl('categories', category.image_path),
  }));
}

export async function listProducts(filters: ProductFilters = {}): Promise<Product[]> {
  return (await listProductsPage(filters, 1, filters.flag ? 16 : 48)).products;
}

export async function listProductsPage(filters: ProductFilters = {}, page = 1, pageSize = 24): Promise<ProductPage> {
  const safePage = Math.max(1, Math.floor(page));
  const safeSize = Math.min(48, Math.max(8, Math.floor(pageSize)));
  if (!isSupabaseConfigured) {
    const search = filters.search?.trim().toLocaleLowerCase();
    const matches = localProducts.filter((product) => {
      const searchable = `${product.name} ${product.sku} ${product.description ?? ''} ${product.category?.name ?? ''}`.toLocaleLowerCase();
      return (!filters.publishedOnly || product.is_published)
        && (!filters.inStock || product.in_stock)
        && (!filters.categorySlug || product.category?.slug === filters.categorySlug)
        && (!filters.flag || product[filters.flag])
        && (!search || searchable.includes(search));
    });
    const from = (safePage - 1) * safeSize;
    return { products: matches.slice(from, from + safeSize), total: matches.length, page: safePage, pageSize: safeSize };
  }

  const client = requireSupabase();
  let matchingCategoryIds: string[] = [];
  if (filters.search?.trim()) {
    const categorySearch = filters.search.trim().replace(/[%(),]/g, ' ');
    const { data: categoryMatches } = await client.from('categories').select('id').ilike('name', `%${categorySearch}%`);
    matchingCategoryIds = (categoryMatches ?? []).map((row: any) => row.id);
  }
  let query = client
    .from('products')
    .select('*, category:categories!inner(id,name,slug)', { count: 'exact' })
    .order('sort_order')
    .order('name');
  if (filters.publishedOnly !== false) query = query.eq('is_published', true);
  if (filters.inStock) query = query.eq('in_stock', true);
  if (filters.flag) query = query.eq(filters.flag, true);
  if (filters.categorySlug) query = query.eq('categories.slug', filters.categorySlug);
  if (filters.search?.trim()) {
    const safe = filters.search.trim().replace(/[%(),]/g, ' ');
    const categoryClause = matchingCategoryIds.length ? `,category_id.in.(${matchingCategoryIds.join(',')})` : '';
    query = query.or(`name.ilike.%${safe}%,sku.ilike.%${safe}%,description.ilike.%${safe}%${categoryClause}`);
  }
  const from = (safePage - 1) * safeSize;
  const { data, error, count } = await query.range(from, from + safeSize - 1);
  if (error) throw error;
  return { products: (data ?? []).map(hydrateProduct), total: count ?? 0, page: safePage, pageSize: safeSize };
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (!isSupabaseConfigured) return localProducts.find((product) => product.slug === slug && product.is_published) ?? null;
  const { data, error } = await requireSupabase()
    .from('products')
    .select('*, category:categories(id,name,slug), product_images(*)')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle();
  if (error) throw error;
  return data ? hydrateProduct(data) : null;
}

export async function listProductsByIds(ids: string[]): Promise<Product[]> {
  const unique = [...new Set(ids)].slice(0, 100);
  if (!unique.length) return [];
  if (!isSupabaseConfigured) return localProducts.filter((product) => unique.includes(product.id) && product.is_published);
  const { data, error } = await requireSupabase().from('products')
    .select('*, category:categories(id,name,slug)').in('id', unique).eq('is_published', true);
  if (error) throw error;
  return (data ?? []).map(hydrateProduct);
}

export async function listBanners(): Promise<Banner[]> {
  if (!isSupabaseConfigured) return [];
  const now = new Date().toISOString();
  const { data, error } = await requireSupabase()
    .from('banners')
    .select('*')
    .eq('is_active', true)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order('sort_order');
  if (error) throw error;
  return (data ?? []).map((banner: any) => ({
    ...banner,
    image_url: publicStorageUrl('banners', banner.image_path),
  }));
}

export function getLocalProductCount(): number {
  return localProducts.length;
}
