import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const repositoryRoot = resolve(import.meta.dirname, '..');
const customerRoot = resolve(repositoryRoot, 'apps/customer');
const publicDirectory = resolve(customerRoot, 'public');
const sitemapPath = resolve(publicDirectory, 'sitemap.xml');
const defaultSiteUrl = 'https://www.balaji-pooja-store.com';

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
const siteUrl = (process.env.SITE_URL ?? localEnvironment.SITE_URL ?? defaultSiteUrl)
  .replace(/\/+$/u, '');
const supabaseUrl = process.env.VITE_SUPABASE_URL ?? localEnvironment.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY ?? localEnvironment.VITE_SUPABASE_ANON_KEY;

if (!/^https:\/\//u.test(siteUrl)) {
  throw new Error('SITE_URL must be an absolute HTTPS URL.');
}

function asUrl(pathname) {
  return `${siteUrl}${pathname}`;
}

function formatLastModified(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString().slice(0, 10) : date.toISOString().slice(0, 10);
}

async function fetchPublicRows(table, query) {
  if (!supabaseUrl || !supabaseAnonKey) return [];

  const response = await fetch(`${supabaseUrl.replace(/\/+$/u, '')}/rest/v1/${table}?${query}`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Could not read public ${table} data while generating the sitemap (${response.status}).`);
  }

  return response.json();
}

async function getCatalogUrls() {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Sitemap: Supabase browser configuration was not available; generated core public URLs only.');
    return [];
  }

  const [categories, products] = await Promise.all([
    fetchPublicRows('categories', 'select=id,slug,updated_at&is_active=eq.true&order=sort_order.asc'),
    fetchPublicRows('products', 'select=category_id,slug,updated_at&is_published=eq.true&order=sort_order.asc'),
  ]);

  const activeCategoryIds = new Set(categories.map((category) => category.id));
  const categoryUrls = categories
    .filter((category) => typeof category.slug === 'string' && category.slug.length > 0)
    .map((category) => ({ loc: asUrl(`/category/${encodeURIComponent(category.slug)}`), lastmod: formatLastModified(category.updated_at) }));
  const productUrls = products
    .filter((product) => activeCategoryIds.has(product.category_id) && typeof product.slug === 'string' && product.slug.length > 0)
    .map((product) => ({ loc: asUrl(`/product/${encodeURIComponent(product.slug)}`), lastmod: formatLastModified(product.updated_at) }));

  return [...categoryUrls, ...productUrls];
}

function toXml(entries) {
  const rows = entries.map(({ loc, lastmod }) => [
    '  <url>',
    `    <loc>${loc}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    '  </url>',
  ].join('\n'));

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join('\n')}\n</urlset>\n`;
}

const coreUrls = [
  { loc: asUrl('/'), lastmod: formatLastModified() },
  { loc: asUrl('/products'), lastmod: formatLastModified() },
];

const catalogUrls = await getCatalogUrls();
mkdirSync(dirname(sitemapPath), { recursive: true });
writeFileSync(sitemapPath, toXml([...coreUrls, ...catalogUrls]), 'utf8');
console.log(`Sitemap: wrote ${coreUrls.length + catalogUrls.length} public URLs.`);
