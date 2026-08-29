import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { corsHeaders, isOriginAllowed } from './cors';

const tunnelOrigin = 'https://pseudosensational-willis-unobnoxiously.ngrok-free.dev';

describe('Edge Function origin policy', () => {
  beforeEach(() => {
    vi.stubGlobal('Deno', {
      env: {
        get: (name: string) => name === 'CUSTOMER_APP_ORIGINS' ? 'https://shop.example.com' : '',
      },
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('allows the exact customer development tunnel even when production origins are configured', () => {
    expect(isOriginAllowed(tunnelOrigin, 'customer')).toBe(true);
    expect(corsHeaders(tunnelOrigin, 'customer')['Access-Control-Allow-Origin']).toBe(tunnelOrigin);
  });

  it('does not allow an arbitrary tunnel or website origin', () => {
    expect(isOriginAllowed('https://attacker.example', 'customer')).toBe(false);
    expect(corsHeaders('https://attacker.example', 'customer')['Access-Control-Allow-Origin']).toBeUndefined();
  });
});
