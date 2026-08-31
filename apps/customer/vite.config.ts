import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { loadEnv, type Plugin } from 'vite';
import { existsSync, readFileSync } from 'node:fs';

const sitemapSource = new URL('./public/sitemap.xml', import.meta.url);
const robotsSource = new URL('./public/robots.txt', import.meta.url);

function customerSeoAssets(): Plugin {
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
