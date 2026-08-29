import type { OrderStatus } from '@pooja-house/database-types';
import { requireSupabase } from '../lib/supabase';

export interface TrackedOrder {
  order_number: string;
  status: OrderStatus;
  order_date: string;
  latest_update: string;
  cod_total_paise: number;
  delivery_area: string;
  items: Array<{ product_name: string; sku: string; unit_label: string; unit_price_paise: number; quantity: number; line_total_paise: number }>;
  timeline: Array<{ status: OrderStatus; changed_at: string }>;
}

export async function trackOrder(orderNumber: string, token: string): Promise<TrackedOrder> {
  const { data, error } = await requireSupabase().functions.invoke('track-order', { body: { order_number: orderNumber, token } });
  if (error) {
    let message = 'Order not found or tracking link is invalid.';
    const response = (error as unknown as { context?: Response }).context;
    if (response) {
      try { message = (await response.clone().json() as { error?: string }).error ?? message; } catch { /* use privacy-safe fallback */ }
    }
    throw new Error(message);
  }
  return data as TrackedOrder;
}
