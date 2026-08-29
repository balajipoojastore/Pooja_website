import { describe, expect, it } from 'vitest';
import { createGoogleMapsLocationUrl, isSafeGoogleMapsLocationUrl } from './location';

describe('delivery map locations', () => {
  it('creates a stable Google Maps coordinate link without excessive precision', () => {
    expect(createGoogleMapsLocationUrl(12.9715987, 77.5945627)).toBe('https://www.google.com/maps?q=12.971599,77.594563');
  });

  it('rejects unsafe domains and impossible coordinates', () => {
    expect(isSafeGoogleMapsLocationUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeGoogleMapsLocationUrl('https://evil.example/maps?q=12,77')).toBe(false);
    expect(isSafeGoogleMapsLocationUrl('https://www.google.com/maps?q=91.000000,77.000000')).toBe(false);
    expect(createGoogleMapsLocationUrl(12, 181)).toBeNull();
  });
});
