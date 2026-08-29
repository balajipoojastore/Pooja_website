import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, isOriginAllowed, jsonResponse } from '../_shared/cors.ts';
import { buildInvoicePdf } from '../_shared/invoice-pdf.ts';
import { constantTimeEqualHex, isTrackingTokenCurrent, sha256Hex } from '../track-order/tracking-security.ts';

const unavailableMessage = 'Invoice not found or access is invalid.';
const orderNumberPattern = /^TPH-[0-9]{8}-[0-9]{6}$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const tokenPattern = /^[a-f0-9]{64}$/;
const adminRoles = new Set(['admin', 'catalog_manager', 'content_manager']);

function bearerToken(request: Request): string | null {
  const authorization = request.headers.get('authorization') ?? '';
  return authorization.startsWith('Bearer ') ? authorization.slice(7).trim() || null : null;
}

Deno.serve(async (request) => {
  const origin = request.headers.get('origin');
  if (!isOriginAllowed(origin, 'shared')) return jsonResponse({ error: 'Origin not allowed.' }, 403, origin, 'shared');
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin, 'shared') });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405, origin, 'shared');
  if (Number(request.headers.get('content-length') ?? 0) > 4096) return jsonResponse({ error: 'Request too large.' }, 413, origin, 'shared');

  let body: { order_number?: unknown; token?: unknown; order_id?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: unavailableMessage }, 401, origin, 'shared');
  }

  const orderNumber = typeof body.order_number === 'string' ? body.order_number.trim().toUpperCase() : '';
  const trackingToken = typeof body.token === 'string' ? body.token.trim().toLowerCase() : '';
  const orderId = typeof body.order_id === 'string' ? body.order_id.trim().toLowerCase() : '';
  if ((!orderNumberPattern.test(orderNumber) && !uuidPattern.test(orderId)) || (trackingToken && !tokenPattern.test(trackingToken))) {
    return jsonResponse({ error: unavailableMessage }, 401, origin, 'shared');
  }

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return jsonResponse({ error: 'Invoice service is not configured.' }, 503, origin, 'shared');
  const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  let orderQuery = service.from('orders').select('*');
  orderQuery = orderId ? orderQuery.eq('id', orderId) : orderQuery.eq('order_number', orderNumber);
  const { data: order, error: orderError } = await orderQuery.maybeSingle();
  if (orderError || !order) return jsonResponse({ error: unavailableMessage }, 401, origin, 'shared');

  let authorized = false;
  if (trackingToken && orderNumber) {
    const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const fingerprint = await sha256Hex(`invoice:${forwarded}:${orderNumber}`);
    const since = new Date(Date.now() - 15 * 60_000).toISOString();
    const { count } = await service.from('order_submission_attempts').select('id', { count: 'exact', head: true }).eq('request_fingerprint', fingerprint).gte('created_at', since);
    if ((count ?? 0) >= 20) return jsonResponse({ error: 'Too many invoice attempts. Please wait and try again.' }, 429, origin, 'shared');
    await service.from('order_submission_attempts').insert({ request_fingerprint: fingerprint });
    const suppliedHash = await sha256Hex(trackingToken);
    authorized = isTrackingTokenCurrent(String(order.tracking_token_expires_at))
      && constantTimeEqualHex(String(order.tracking_token_hash), suppliedHash);
  } else {
    const jwt = bearerToken(request);
    if (jwt) {
      const { data: userData } = await service.auth.getUser(jwt);
      const user = userData.user;
      if (user && !orderId && order.customer_id === user.id) authorized = true;
      if (user && !authorized) {
        const { data: profile } = await service.from('admin_profiles').select('is_active,role').eq('id', user.id).maybeSingle();
        authorized = Boolean(profile?.is_active && adminRoles.has(String(profile.role)));
      }
    }
  }
  if (!authorized) return jsonResponse({ error: unavailableMessage }, 401, origin, 'shared');

  const [itemsResult, contentResult] = await Promise.all([
    service.from('order_items').select('product_name,sku,unit_label,unit_price_paise,quantity,line_total_paise').eq('order_id', order.id).order('created_at'),
    service.from('site_content').select('content_key,content_value').in('content_key', ['store_name', 'contact_phone', 'contact_email']),
  ]);
  if (itemsResult.error) return jsonResponse({ error: 'Unable to generate this invoice right now.' }, 500, origin, 'shared');
  const content = Object.fromEntries((contentResult.data ?? []).map((row) => [row.content_key, String(row.content_value ?? '')]));
  const deliveryAddress = [
    order.address_line_1,
    order.address_line_2,
    order.landmark ? `Landmark: ${order.landmark}` : null,
    `${order.city}, ${order.state} ${order.pincode}`,
  ].filter((line): line is string => Boolean(line));
  const pdf = await buildInvoicePdf({
    storeName: content.store_name || 'The Pooja House',
    storeContact: [content.contact_phone, content.contact_email].filter(Boolean).join(' | '),
    orderNumber: order.order_number,
    orderDate: order.created_at,
    customerName: order.full_name,
    customerPhone: order.mobile,
    deliveryAddress,
    orderStatus: order.status,
    subtotalPaise: order.subtotal_paise,
    discountPaise: order.discount_paise,
    deliveryFeePaise: order.delivery_fee_paise,
    totalPaise: order.total_paise,
    lines: itemsResult.data ?? [],
  });
  const filename = `${String(order.order_number).replace(/[^A-Z0-9-]/gi, '')}-invoice.pdf`;
  return new Response(pdf, {
    status: 200,
    headers: {
      ...corsHeaders(origin, 'shared'),
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(pdf.byteLength),
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  });
});
