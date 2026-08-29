import { corsHeaders, isOriginAllowed, jsonResponse } from '../_shared/cors.ts';

// Kept as a retired endpoint so an old scheduler or bookmarked admin action cannot
// accidentally send a WhatsApp message. Invoices are now generated on demand by
// the token/ownership-protected download-invoice function.
Deno.serve((request) => {
  const origin = request.headers.get('origin');
  if (!isOriginAllowed(origin, 'admin')) return jsonResponse({ error: 'Origin not allowed.' }, 403, origin, 'admin');
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin, 'admin') });
  return jsonResponse({
    error: 'WhatsApp invoice delivery has been retired. Use the secure PDF download instead.',
  }, 410, origin, 'admin');
});
