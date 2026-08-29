type FunctionAudience = 'customer' | 'admin' | 'shared';

const customerDevelopmentOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://pseudosensational-willis-unobnoxiously.ngrok-free.dev',
];

const adminDevelopmentOrigins = [
  'http://localhost:5174',
  'http://127.0.0.1:5174',
];

function envOrigins(name: string): string[] {
  return (Deno.env.get(name) ?? '').split(',').map((value) => value.trim()).filter(Boolean);
}

export function allowedOrigins(audience: FunctionAudience): string[] {
  const shared = envOrigins('ALLOWED_ORIGINS');
  const customer = envOrigins('CUSTOMER_APP_ORIGINS');
  const admin = envOrigins('ADMIN_APP_ORIGINS');
  const configured = audience === 'customer' ? [...customer, ...shared]
    : audience === 'admin' ? [...admin, ...shared]
    : [...customer, ...admin, ...shared];
  const development = audience === 'customer' ? customerDevelopmentOrigins
    : audience === 'admin' ? adminDevelopmentOrigins
    : [...customerDevelopmentOrigins, ...adminDevelopmentOrigins];
  return [...new Set([...development, ...configured])];
}

export function isOriginAllowed(origin: string | null, audience: FunctionAudience): boolean {
  return origin === null || allowedOrigins(audience).includes(origin);
}

export function corsHeaders(origin: string | null, audience: FunctionAudience): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
  if (origin && isOriginAllowed(origin, audience)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

export function jsonResponse(body: unknown, status: number, origin: string | null, audience: FunctionAudience): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin, audience), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
