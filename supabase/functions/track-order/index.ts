import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, isOriginAllowed, jsonResponse } from '../_shared/cors.ts';
import { constantTimeEqualHex, isTrackingTokenCurrent, maskedArea, sha256Hex } from './tracking-security.ts';

const invalidMessage = 'Order not found or tracking link is invalid.';

Deno.serve(async (request) => {
  const origin = request.headers.get('origin');
  if (!isOriginAllowed(origin, 'customer')) return jsonResponse({ error: 'Origin not allowed.' }, 403, origin, 'customer');
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin, 'customer') });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405, origin, 'customer');
  if (Number(request.headers.get('content-length') ?? 0) > 4096) return jsonResponse({ error: 'Request too large.' }, 413, origin, 'customer');

  let body: { order_number?: unknown; token?: unknown };
  try { body = await request.json(); } catch { return jsonResponse({ error: invalidMessage }, 401, origin, 'customer'); }
  const orderNumber = typeof body.order_number === 'string' ? body.order_number.trim().toUpperCase() : '';
  const token = typeof body.token === 'string' ? body.token.trim().toLowerCase() : '';
  if (!/^TPH-[0-9]{8}-[0-9]{6}$/.test(orderNumber) || !/^[a-f0-9]{64}$/.test(token)) return jsonResponse({ error: invalidMessage }, 401, origin, 'customer');

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return jsonResponse({ error: 'Tracking service is not configured.' }, 503, origin, 'customer');
  const client = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const fingerprint = await sha256Hex(`track:${forwarded}:${orderNumber}`);
  const since = new Date(Date.now() - 15 * 60_000).toISOString();
  const { count } = await client.from('order_submission_attempts').select('id', { count: 'exact', head: true }).eq('request_fingerprint', fingerprint).gte('created_at', since);
  if ((count ?? 0) >= 30) return jsonResponse({ error: 'Too many tracking attempts. Please wait and try again.' }, 429, origin, 'customer');
  await client.from('order_submission_attempts').insert({ request_fingerprint: fingerprint });

  const { data: order } = await client.from('orders').select('id,order_number,status,total_paise,city,state,pincode,created_at,updated_at,tracking_token_hash,tracking_token_expires_at').eq('order_number', orderNumber).maybeSingle();
  const suppliedHash = await sha256Hex(token);
  if (!order || !isTrackingTokenCurrent(String(order.tracking_token_expires_at)) || !constantTimeEqualHex(String(order.tracking_token_hash), suppliedHash)) return jsonResponse({ error: invalidMessage }, 401, origin, 'customer');

  const [itemsResult, historyResult] = await Promise.all([
    client.from('order_items').select('product_name,sku,unit_label,unit_price_paise,quantity,line_total_paise').eq('order_id', order.id).order('created_at'),
    client.from('order_status_history').select('to_status,change_source,note,changed_at').eq('order_id', order.id).order('changed_at'),
  ]);
  if (itemsResult.error || historyResult.error) return jsonResponse({ error: 'Unable to load tracking details.' }, 500, origin, 'customer');
  return jsonResponse({
    order_number: order.order_number,
    status: order.status,
    order_date: order.created_at,
    latest_update: order.updated_at,
    cod_total_paise: order.total_paise,
    delivery_area: maskedArea(order.city, order.state, order.pincode),
    items: itemsResult.data ?? [],
    timeline: (historyResult.data ?? []).map((entry) => ({ status: entry.to_status, changed_at: entry.changed_at })),
  }, 200, origin, 'customer');
});
