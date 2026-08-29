import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, isOriginAllowed, jsonResponse } from '../_shared/cors.ts';
import { calculateAuthoritativeOrder } from './order-guards.ts';

type OrderBody = {
  address_id: string;
  items: Array<{ product_id: string; quantity: number }>;
  offer_code?: string | null;
  idempotency_key: string;
  delivery_instructions?: string | null;
};

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isValidBody(value: unknown): value is OrderBody {
  if (!value || typeof value !== 'object') return false;
  const body = value as Record<string, unknown>;
  return isUuid(body.address_id)
    && isUuid(body.idempotency_key)
    && Array.isArray(body.items) && body.items.length > 0 && body.items.length <= 30
    && body.items.every((item) => item && typeof item === 'object'
      && isUuid((item as Record<string, unknown>).product_id)
      && Number.isInteger((item as Record<string, unknown>).quantity)
      && Number((item as Record<string, unknown>).quantity) >= 1
      && Number((item as Record<string, unknown>).quantity) <= 99)
    && (body.offer_code == null || (typeof body.offer_code === 'string' && body.offer_code.length <= 32))
    && (body.delivery_instructions == null || (typeof body.delivery_instructions === 'string' && body.delivery_instructions.length <= 500));
}

Deno.serve(async (request) => {
  const origin = request.headers.get('origin');
  if (!isOriginAllowed(origin, 'customer')) return jsonResponse({ error: 'Origin not allowed.' }, 403, origin, 'customer');
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin, 'customer') });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405, origin, 'customer');
  if (Number(request.headers.get('content-length') ?? 0) > 32_768) return jsonResponse({ error: 'Request too large.' }, 413, origin, 'customer');

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return jsonResponse({ error: 'Order service is not configured.' }, 503, origin, 'customer');

  const authorization = request.headers.get('authorization') ?? '';
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return jsonResponse({ error: 'Please sign in before placing your order.' }, 401, origin, 'customer');

  const client = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData, error: authError } = await client.auth.getUser(token);
  const customerId = authData.user?.id;
  if (authError || !customerId || !authData.user?.email) {
    return jsonResponse({ error: 'Your session has expired. Please sign in again.' }, 401, origin, 'customer');
  }

  let body: unknown;
  try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid JSON.' }, 400, origin, 'customer'); }
  if (!isValidBody(body)) return jsonResponse({ error: 'Invalid order request.' }, 400, origin, 'customer');

  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const bytes = new TextEncoder().encode(`${customerId}:${forwarded}:${request.headers.get('user-agent') ?? ''}`);
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map((byte) => byte.toString(16).padStart(2, '0')).join('');
  const since = new Date(Date.now() - 15 * 60_000).toISOString();
  const { count } = await client.from('order_submission_attempts').select('id', { count: 'exact', head: true }).eq('request_fingerprint', digest).gte('created_at', since);
  if ((count ?? 0) >= 8) return jsonResponse({ error: 'Too many order attempts. Please wait and try again.' }, 429, origin, 'customer');
  await client.from('order_submission_attempts').insert({ request_fingerprint: digest });

  const itemIds = body.items.map((item) => item.product_id);
  const [productsResult, addressResult] = await Promise.all([
    client.from('products').select('id,price_paise,is_published,in_stock').in('id', itemIds),
    client.from('customer_addresses').select('id,customer_id,pincode').eq('id', body.address_id).eq('customer_id', customerId).maybeSingle(),
  ]);
  if (!addressResult.data) return jsonResponse({ error: 'Choose a valid delivery address.' }, 400, origin, 'customer');
  const { data: area } = await client.from('serviceable_pincodes')
    .select('pincode,delivery_fee_paise,minimum_order_paise,is_active')
    .eq('pincode', addressResult.data.pincode).eq('is_active', true).maybeSingle();

  let offer = null;
  if (typeof body.offer_code === 'string' && body.offer_code.trim()) {
    const { data } = await client.from('offers').select('discount_type,discount_value,minimum_order_paise,maximum_discount_paise,is_active,starts_at,ends_at').eq('code', body.offer_code.trim().toUpperCase()).maybeSingle();
    const now = Date.now();
    if (data && (!data.starts_at || Date.parse(data.starts_at) <= now) && (!data.ends_at || Date.parse(data.ends_at) >= now)) offer = data;
  }
  try {
    calculateAuthoritativeOrder({ lines: body.items, products: productsResult.data ?? [], area, offer });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Invalid order.' }, 400, origin, 'customer');
  }

  const { data, error } = await client.rpc('create_authenticated_cod_order', {
    p_customer_id: customerId,
    p_address_id: body.address_id,
    p_items: body.items,
    p_offer_code: typeof body.offer_code === 'string' ? body.offer_code.trim().toUpperCase() || null : null,
    p_idempotency_key: body.idempotency_key,
    p_customer_notes: typeof body.delivery_instructions === 'string' ? body.delivery_instructions.trim() || null : null,
  });
  if (error) {
    console.error('Authenticated COD transaction failed', { code: error.code, message: error.message });
    const safeMessage = /pincode|minimum order|offer|product unavailable|profile incomplete|address unavailable/i.test(error.message)
      ? error.message : 'Unable to create this order. Please try again.';
    return jsonResponse({ error: safeMessage }, error.code === '42501' ? 403 : 400, origin, 'customer');
  }
  const order = data?.[0];
  if (!order) return jsonResponse({ error: 'Order creation returned no confirmation.' }, 500, origin, 'customer');
  return jsonResponse({
    order_id: order.order_id,
    order_number: order.order_number,
    total_paise: order.total_paise,
    payment_method: 'Cash on Delivery',
    tracking_token: order.tracking_token,
  }, 201, origin, 'customer');
});
