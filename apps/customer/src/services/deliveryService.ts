import { isSupabaseConfigured, requireSupabase } from '../lib/supabase';
import type { ServiceablePincode } from '../types/domain';
import { pincodeSchema } from '../utils/validation';

export async function checkPincode(pincode: string): Promise<ServiceablePincode | null> {
  const parsed = pincodeSchema.safeParse(pincode);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Invalid PIN code.');
  if (!isSupabaseConfigured) return null;
  const { data, error } = await requireSupabase().rpc('check_delivery_pincode', { p_pincode: parsed.data });
  if (error) throw error;
  return data?.[0] ?? null;
}
