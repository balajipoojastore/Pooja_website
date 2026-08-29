import { describe, expect, it } from 'vitest';
import { constantTimeEqualHex, isTrackingTokenCurrent, maskedArea, sha256Hex } from './tracking-security';

describe('tracking token security', () => {
  it('hashes tokens and verifies exact hashes', async () => {
    const hash = await sha256Hex('a'.repeat(64));
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(constantTimeEqualHex(hash, hash)).toBe(true);
    expect(constantTimeEqualHex(hash, `${hash.slice(0, -1)}0`)).toBe(false);
  });
  it('returns only a masked delivery area', () => expect(maskedArea('Mysuru', 'Karnataka', '570001')).toBe('Mysuru, Karnataka · PIN ••••01'));
  it('rejects expired or malformed tracking-token lifetimes', () => {
    const now = Date.parse('2026-08-21T00:00:00Z');
    expect(isTrackingTokenCurrent('2026-08-22T00:00:00Z', now)).toBe(true);
    expect(isTrackingTokenCurrent('2026-08-20T00:00:00Z', now)).toBe(false);
    expect(isTrackingTokenCurrent('not-a-date', now)).toBe(false);
  });
});
