import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { loadEnv, type Plugin } from 'vite';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sitemapSource = new URL('./public/sitemap.xml', import.meta.url);
const robotsSource = new URL('./public/robots.txt', import.meta.url);
const seoManifestSource = new URL('./public/seo-pages.json', import.meta.url);
const socialCardSource = new URL('./src/assets/balaji-pooja-store-shop.webp', import.meta.url);
const socialCardUrl = 'https://www.balaji-pooja-store.com/social-card.webp';

type SeoPage = {
  path: string;
  loc: string;
  title: string;
  description: string;
  type: string;
  image?: string | null;
  product?: { name: string; sku: string; description: string; price: string; availability: string; unitLabel: string; image?: string | null };
};

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/gu, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character);
}

function productSchema(page: SeoPage) {
  if (!page.product) return '';
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: page.product.name,
    sku: page.product.sku,
    description: page.product.description,
    image: page.product.image ? [page.product.image] : undefined,
    additionalProperty: { '@type': 'PropertyValue', name: 'Package size', value: page.product.unitLabel },
    offers: {
      '@type': 'Offer',
      url: page.loc,
      priceCurrency: 'INR',
      price: page.product.price,
      availability: page.product.availability,
      itemCondition: 'https://schema.org/NewCondition',
    },
  };
  return `<script type="application/ld+json">${JSON.stringify(schema).replace(/</gu, '\\u003c')}</script>`;
}

function pageMetadata(page: SeoPage) {
  const title = escapeHtml(page.title);
  const description = escapeHtml(page.description);
  const url = escapeHtml(page.loc);
  const type = page.type === 'product' ? 'product' : 'website';
  const image = page.image ?? socialCardUrl;
  const twitterCard = 'summary_large_image';
  return `<!-- SEO_PAGE_METADATA_START -->
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta name="robots" content="index,follow" />
    <link rel="canonical" href="${url}" />
    <meta property="og:type" content="${type}" />
    <meta property="og:site_name" content="Balaji Pooja Store" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${url}" />
    <meta name="twitter:card" content="${twitterCard}" />
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    ${productSchema(page)}
    <!-- SEO_PAGE_METADATA_END -->`;
}

function customerSeoAssets(): Plugin {
  const outputDirectory = resolve(import.meta.dirname, 'dist');
  return {
    name: 'customer-seo-assets',
    apply: 'build',
    generateBundle() {
      for (const [filename, source] of [['sitemap.xml', sitemapSource], ['robots.txt', robotsSource]] as const) {
        if (!existsSync(source)) {
          throw new Error(`${filename} was not generated before the customer build.`);
        }
        this.emitFile({ type: 'asset', fileName: filename, source: readFileSync(source, 'utf8') });
      }
      this.emitFile({ type: 'asset', fileName: 'social-card.webp', source: readFileSync(socialCardSource) });
    },

    closeBundle() {
      if (!existsSync(seoManifestSource)) throw new Error('seo-pages.json was not generated before the customer build.');
      const manifest = JSON.parse(readFileSync(seoManifestSource, 'utf8')) as { pages?: SeoPage[] };
      const indexPath = resolve(outputDirectory, 'index.html');
      if (!existsSync(indexPath)) throw new Error('Customer index.html was not available for static metadata generation.');
      const baseHtml = readFileSync(indexPath, 'utf8');
      const pages = manifest.pages ?? [];

      for (const page of pages) {
        if (page.path === '/') continue;
        const html = baseHtml.replace(/<!-- SEO_PAGE_METADATA_START -->[\s\S]*?<!-- SEO_PAGE_METADATA_END -->/u, pageMetadata(page));
        const targetDirectory = resolve(outputDirectory, page.path.replace(/^\/+|\/+$/gu, ''));
        mkdirSync(targetDirectory, { recursive: true });
        writeFileSync(resolve(targetDirectory, 'index.html'), html, 'utf8');
      }
    },
  };
}

function isPrivilegedSupabaseKey(key: string) {
  if (/^sb_secret_/i.test(key) || /service[_-]?role/i.test(key)) return true;
  const payload = key.split('.')[1];
  if (!payload) return false;
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')).role === 'service_role';
  } catch {
    return false;
  }
}

export default defineConfig(({ command, mode }) => {
  if (command === 'build') {
    const env = loadEnv(mode, process.cwd(), 'VITE_');
    const url = env.VITE_SUPABASE_URL?.trim() ?? '';
    const anonKey = env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';
    if (!url || !anonKey) throw new Error('Customer production build requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    try {
      if (new URL(url).protocol !== 'https:') throw new Error();
    } catch {
      throw new Error('VITE_SUPABASE_URL must be a valid HTTPS URL.');
    }
    if (isPrivilegedSupabaseKey(anonKey)) throw new Error('VITE_SUPABASE_ANON_KEY must never contain a service-role or secret key.');
  }

  return {
    plugins: [react(), customerSeoAssets()],
    // Local catalog images support offline development only. Production images
    // come from Supabase Storage and should not inflate the Vercel deployment.
    publicDir: command === 'serve' ? '../../catalog/images' : false,
    server: {
      allowedHosts: ['pseudosensational-willis-unobnoxiously.ngrok-free.dev'],
    },
    build: { outDir: 'dist', emptyOutDir: true },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test/setup.ts',
    },
  };
});
