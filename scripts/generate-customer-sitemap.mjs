import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const repositoryRoot = resolve(import.meta.dirname, '..');
const customerRoot = resolve(repositoryRoot, 'apps/customer');
const publicDirectory = resolve(customerRoot, 'public');
const sitemapPath = resolve(publicDirectory, 'sitemap.xml');
const seoManifestPath = resolve(publicDirectory, 'seo-pages.json');
const defaultSiteUrl = 'https://www.balaji-pooja-store.com';
const storeName = 'Balaji Pooja Store';

function readLocalEnvironment() {
  const env = {};
  for (const filename of ['.env.local', '.env']) {
    const path = resolve(customerRoot, filename);
    if (!existsSync(path)) continue;
    for (const rawLine of readFileSync(path, 'utf8').split(/\r?\n/u)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const separator = line.indexOf('=');
      if (separator <= 0) continue;
      const key = line.slice(0, separator).trim();
      const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/gu, '');
      if (key && value) env[key] = value;
    }
  }
  return env;
}

const localEnvironment = readLocalEnvironment();
const siteUrl = (process.env.SITE_URL ?? localEnvironment.SITE_URL ?? defaultSiteUrl).replace(/\/+$/u, '');
const supabaseUrl = process.env.VITE_SUPABASE_URL ?? localEnvironment.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY ?? localEnvironment.VITE_SUPABASE_ANON_KEY;

if (!/^https:\/\//u.test(siteUrl)) throw new Error('SITE_URL must be an absolute HTTPS URL.');

function asUrl(pathname) { return `${siteUrl}${pathname}`; }

function formatLastModified(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString().slice(0, 10) : date.toISOString().slice(0, 10);
}

function cleanText(value, fallback) {
  const text = typeof value === 'string' ? value.replace(/\s+/gu, ' ').trim() : '';
  return (text.length >= 20 ? text : fallback).slice(0, 190);
}

function publicProductImage(path) {
  if (!path || !supabaseUrl) return null;
  const encodedPath = String(path).split('/').map(encodeURIComponent).join('/');
  return `${supabaseUrl.replace(/\/+$/u, '')}/storage/v1/object/public/products/${encodedPath}`;
}

async function fetchPublicRows(table, query) {
  if (!supabaseUrl || !supabaseAnonKey) return [];
  const response = await fetch(`${supabaseUrl.replace(/\/+$/u, '')}/rest/v1/${table}?${query}`, {
    headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` },
  });
  if (!response.ok) throw new Error(`Could not read public ${table} data while generating the sitemap (${response.status}).`);
  return response.json();
}

async function getCatalogPages() {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Sitemap: Supabase browser configuration was not available; generated core public URLs only.');
    return [];
  }

  const [categories, products] = await Promise.all([
    fetchPublicRows('categories', 'select=id,name,slug,description,updated_at&is_active=eq.true&order=sort_order.asc'),
    fetchPublicRows('products', 'select=category_id,name,slug,sku,short_description,description,price_paise,mrp_paise,in_stock,unit_label,primary_image_path,updated_at&is_published=eq.true&order=sort_order.asc'),
  ]);

  const activeCategoryIds = new Set(categories.map((category) => category.id));
  const categoryPages = categories
    .filter((category) => typeof category.slug === 'string' && category.slug.length > 0)
    .map((category) => {
      const path = `/category/${encodeURIComponent(category.slug)}`;
      const description = cleanText(category.description, `Shop ${category.name} for daily pooja and celebrations.`);
      return { path, loc: asUrl(path), lastmod: formatLastModified(category.updated_at), title: `${category.name} | ${storeName}`, description, type: 'category' };
    });
  const productPages = products
    .filter((product) => activeCategoryIds.has(product.category_id) && typeof product.slug === 'string' && product.slug.length > 0)
    .map((product) => {
      const path = `/product/${encodeURIComponent(product.slug)}`;
      const description = cleanText(product.short_description ?? product.description, `Buy ${product.name} from ${storeName}.`);
      return {
        path,
        loc: asUrl(path),
        lastmod: formatLastModified(product.updated_at),
        title: `${product.name} | ${storeName}`,
        description,
        type: 'product',
        image: publicProductImage(product.primary_image_path),
        product: {
          name: product.name,
          sku: product.sku,
          description,
          price: (Number(product.price_paise) / 100).toFixed(2),
          availability: product.in_stock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          unitLabel: product.unit_label,
          image: publicProductImage(product.primary_image_path),
        },
      };
    });

  return [...categoryPages, ...productPages];
}

function toXml(entries) {
  const rows = entries.map(({ loc, lastmod }) => ['  <url>', `    <loc>${loc}</loc>`, `    <lastmod>${lastmod}</lastmod>`, '  </url>'].join('\n'));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join('\n')}\n</urlset>\n`;
}

const generatedAt = new Date().toISOString();
const corePages = [
  { path: '/', loc: asUrl('/'), lastmod: formatLastModified(generatedAt), title: `${storeName} | Pooja essentials in Varthur`, description: 'Authentic pooja essentials, brass items, diyas, incense and more - delivered in Varthur, Bengaluru.', type: 'website' },
  { path: '/products', loc: asUrl('/products'), lastmod: formatLastModified(generatedAt), title: `Pooja Products | ${storeName}`, description: 'Shop authentic pooja essentials for daily rituals, festivals and celebrations from Balaji Pooja Store.', type: 'website' },
];

const catalogPages = await getCatalogPages();
const pages = [...corePages, ...catalogPages];
mkdirSync(dirname(sitemapPath), { recursive: true });
writeFileSync(sitemapPath, toXml(pages), 'utf8');
writeFileSync(seoManifestPath, `${JSON.stringify({ siteUrl, storeName, generatedAt, pages }, null, 2)}\n`, 'utf8');
console.log(`Sitemap: wrote ${pages.length} public URLs and static metadata pages.`);
