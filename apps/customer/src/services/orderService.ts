import { requireSupabase } from '../lib/supabase';
import type { CartLine, OrderConfirmation } from '../types/domain';

export async function createCodOrder(
  addressId: string,
  lines: CartLine[],
  idempotencyKey: string,
  offerCode?: string,
  deliveryInstructions?: string,
): Promise<OrderConfirmation> {
  const { data, error } = await requireSupabase().functions.invoke('create-cod-order', {
    body: {
      address_id: addressId,
      items: lines.map((line) => ({ product_id: line.productId, quantity: line.quantity })),
      offer_code: offerCode || null,
      idempotency_key: idempotencyKey,
      delivery_instructions: deliveryInstructions || null,
    },
  });
  if (error) {
    let message = error.message;
    const response = (error as unknown as { context?: Response }).context;
    if (response) {
      try { message = (await response.clone().json() as { error?: string }).error ?? message; } catch { /* retain SDK-safe fallback */ }
    }
    throw new Error(message);
  }
  if (!data?.order_number || !Number.isInteger(data.total_paise)) throw new Error('The order service returned an invalid response.');
  return {
    orderId: data.order_id,
    orderNumber: data.order_number,
    totalPaise: data.total_paise,
    paymentMethod: 'Cash on Delivery',
    trackingToken: typeof data.tracking_token === 'string' && /^[a-f0-9]{64}$/i.test(data.tracking_token) ? data.tracking_token : null,
  };
}
