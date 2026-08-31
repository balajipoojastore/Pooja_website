import { useEffect } from 'react';

export const SEO_SITE_URL = (import.meta.env.VITE_SITE_URL?.trim() || 'https://www.balaji-pooja-store.com').replace(/\/+$/u, '');
export const SEO_STORE_NAME = 'Balaji Pooja Store';

export type PageMetadata = {
  title: string;
  description: string;
  pathname: string;
  noIndex?: boolean;
  type?: 'website' | 'product';
  image?: string | null;
};

function ensureMeta(attribute: 'name' | 'property', value: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${value}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, value);
    document.head.append(element);
  }
  return element;
}

function ensureCanonical() {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!element) {
    element = document.createElement('link');
    element.rel = 'canonical';
    document.head.append(element);
  }
  return element;
}

export function canonicalUrl(pathname: string) {
  const normalizedPath = pathname === '/' ? '/' : `/${pathname.replace(/^\/+|\/+$/gu, '')}`;
  return `${SEO_SITE_URL}${normalizedPath}`;
}

export function applyPageMetadata({ title, description, pathname, noIndex = false, type = 'website', image }: PageMetadata) {
  const canonical = canonicalUrl(pathname);
  document.title = title;
  ensureMeta('name', 'description').content = description;
  ensureMeta('name', 'robots').content = noIndex ? 'noindex,nofollow,noarchive' : 'index,follow,max-image-preview:large';
  ensureCanonical().href = canonical;
  ensureMeta('property', 'og:type').content = type;
  ensureMeta('property', 'og:site_name').content = SEO_STORE_NAME;
  ensureMeta('property', 'og:title').content = title;
  ensureMeta('property', 'og:description').content = description;
  ensureMeta('property', 'og:url').content = canonical;
  ensureMeta('name', 'twitter:card').content = image ? 'summary_large_image' : 'summary';
  ensureMeta('name', 'twitter:title').content = title;
  ensureMeta('name', 'twitter:description').content = description;

  const imageMeta = document.head.querySelector<HTMLMetaElement>('meta[property="og:image"]');
  if (image) {
    (imageMeta ?? ensureMeta('property', 'og:image')).content = image;
  } else {
    imageMeta?.remove();
  }
}

export function usePageMetadata(metadata: PageMetadata) {
  const { title, description, pathname, noIndex, type, image } = metadata;
  useEffect(() => {
    applyPageMetadata({ title, description, pathname, noIndex, type, image });
  }, [title, description, pathname, noIndex, type, image]);
}

export function useJsonLd(id: string, value: Record<string, unknown> | null) {
  useEffect(() => {
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (!value) {
      existing?.remove();
      return;
    }
    const script: HTMLScriptElement = existing ?? document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(value).replace(/</gu, '\\u003c');
    if (!existing) document.head.append(script);
    return () => { script.remove(); };
  }, [id, value]);
}
