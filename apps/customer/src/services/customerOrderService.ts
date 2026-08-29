import { requireSupabase } from '../lib/supabase';

export type CustomerOrder = {
  id: string;
  order_number: string;
  status: 'placed' | 'confirmed' | 'out_for_delivery' | 'delivered' | 'cancelled';
  total_paise: number;
  created_at: string;
  updated_at: string;
  order_items: Array<{ product_name: string; sku: string; quantity: number; line_total_paise: number }>;
};

export async function listMyOrders(): Promise<CustomerOrder[]> {
  const { data, error } = await requireSupabase().from('orders')
    .select('id,order_number,status,total_paise,created_at,updated_at,order_items(product_name,sku,quantity,line_total_paise)')
    .order('created_at', { ascending: false }).limit(50);
  if (error) throw error;
  return (data ?? []) as CustomerOrder[];
}
