import { beforeEach, describe, expect, it } from 'vitest';
import { applyPageMetadata, canonicalUrl } from './seo';

describe('customer SEO canonical URLs', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.title = '';
  });

  it('uses the canonical production host and excludes query strings', () => {
    expect(canonicalUrl('/product/brass-diya')).toBe('https://www.balaji-pooja-store.com/product/brass-diya');
    expect(canonicalUrl('/')).toBe('https://www.balaji-pooja-store.com/');
  });

  it('applies canonical, Open Graph, and Twitter metadata for public pages', () => {
    applyPageMetadata({
      title: 'Brass Diya | Balaji Pooja Store',
      description: 'A brass diya for daily pooja.',
      pathname: '/product/brass-diya',
      type: 'product',
      image: 'https://cdn.example.test/diya.jpg',
    });

    expect(document.title).toBe('Brass Diya | Balaji Pooja Store');
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://www.balaji-pooja-store.com/product/brass-diya',
    );
    expect(document.head.querySelector('meta[property="og:type"]')?.getAttribute('content')).toBe('product');
    expect(document.head.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe(
      'https://cdn.example.test/diya.jpg',
    );
    expect(document.head.querySelector('meta[name="twitter:card"]')?.getAttribute('content')).toBe('summary_large_image');
  });

  it('marks account and checkout-style pages as non-indexable when requested', () => {
    applyPageMetadata({
      title: 'Checkout | Balaji Pooja Store',
      description: 'Private checkout.',
      pathname: '/checkout',
      noIndex: true,
    });

    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex,nofollow,noarchive');
  });
});
