import type { Session, User } from '@supabase/supabase-js';
import { requireSupabase } from '../lib/supabase';
import { isSafeGoogleMapsLocationUrl } from '../utils/location';
import type { CustomerAddressUpdateInput, CustomerProfileUpdateInput } from '../utils/validation';

export type CustomerProfile = {
  id: string;
  full_name: string;
  phone: string;
  created_at: string;
  updated_at: string;
};

export type CustomerAddress = {
  id: string;
  customer_id: string;
  label: string;
  address_line_1: string;
  address_line_2: string | null;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  location_url: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type SignupDetails = {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  locationUrl?: string;
};

export async function sendCustomerOtp(email: string, mode: 'login' | 'signup'): Promise<void> {
  const { error } = await requireSupabase().auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { shouldCreateUser: mode === 'signup' },
  });
  if (error) {
    if (mode === 'login') throw new Error('We couldn’t sign you in. Check your email or create a new account.');
    if (/rate|limit/i.test(error.message)) throw new Error('Too many attempts. Please wait before requesting another code.');
    throw new Error('We couldn’t send the verification code. Please try again.');
  }
}

export async function verifyCustomerOtp(email: string, token: string): Promise<{ user: User; session: Session }> {
  const { data, error } = await requireSupabase().auth.verifyOtp({
    email: email.trim().toLowerCase(), token, type: 'email',
  });
  if (error || !data.user || !data.session) {
    if (/expired/i.test(error?.message ?? '')) throw new Error('This code has expired. Request a new code.');
    if (/rate|limit/i.test(error?.message ?? '')) throw new Error('Too many attempts. Please wait and try again.');
    throw new Error('That verification code is invalid. Check the six digits and try again.');
  }
  return { user: data.user, session: data.session };
}

export async function loadCustomerAccount(userId: string): Promise<{ profile: CustomerProfile | null; addresses: CustomerAddress[] }> {
  const client = requireSupabase();
  const [profileResult, addressesResult] = await Promise.all([
    client.from('customer_profiles').select('*').eq('id', userId).maybeSingle(),
    client.from('customer_addresses').select('*').eq('customer_id', userId).order('is_default', { ascending: false }).order('created_at'),
  ]);
  if (profileResult.error) throw profileResult.error;
  if (addressesResult.error) throw addressesResult.error;
  return { profile: profileResult.data as CustomerProfile | null, addresses: (addressesResult.data ?? []) as CustomerAddress[] };
}

export async function completeCustomerSignup(details: SignupDetails): Promise<void> {
  const { error } = await requireSupabase().rpc('complete_customer_signup', {
    p_full_name: details.fullName.trim(),
    p_phone: details.phone,
    p_address: {
      label: 'Home',
      address_line_1: details.addressLine1.trim(),
      address_line_2: details.addressLine2?.trim() || null,
      landmark: details.landmark?.trim() || null,
      city: details.city.trim(),
      state: details.state.trim(),
      pincode: details.pincode,
      location_url: details.locationUrl || null,
    },
  });
  if (error) {
    if (/pincode/i.test(error.message)) throw new Error('Delivery is not available for this PIN code.');
    throw new Error('We couldn’t complete your profile. Please review the details and try again.');
  }
}

export async function updateCustomerProfile(details: CustomerProfileUpdateInput): Promise<void> {
  const { error } = await requireSupabase().rpc('update_customer_profile', {
    p_full_name: details.fullName.trim(),
    p_phone: details.phone,
  });
  if (error) {
    if (/mobile/i.test(error.message)) throw new Error('Enter a valid 10-digit Indian mobile number.');
    throw new Error('We could not update your profile. Please try again.');
  }
}

export async function updateCustomerAddress(addressId: string, details: CustomerAddressUpdateInput): Promise<void> {
  if (details.locationUrl && !isSafeGoogleMapsLocationUrl(details.locationUrl)) {
    throw new Error('Enter a valid Google Maps location.');
  }
  const { error } = await requireSupabase().rpc('update_customer_address', {
    p_address_id: addressId,
    p_address: {
      label: details.label.trim(),
      address_line_1: details.addressLine1.trim(),
      address_line_2: details.addressLine2?.trim() || null,
      landmark: details.landmark?.trim() || null,
      city: details.city.trim(),
      state: details.state.trim(),
      pincode: details.pincode,
      location_url: details.locationUrl || null,
    },
  });
  if (error) {
    if (/pincode/i.test(error.message)) throw new Error('Delivery is not available for this PIN code.');
    if (/address not found|permission/i.test(error.message)) throw new Error('This address could not be updated.');
    throw new Error('We could not update your address. Please review the details and try again.');
  }
}

export async function updateCustomerAddressLocation(addressId: string, locationUrl: string): Promise<void> {
  if (locationUrl && !isSafeGoogleMapsLocationUrl(locationUrl)) throw new Error('Invalid map location.');
  const { error } = await requireSupabase().from('customer_addresses')
    .update({ location_url: locationUrl || null })
    .eq('id', addressId);
  if (error) throw new Error('We could not update this map location.');
}

export async function signOutCustomer(): Promise<void> {
  const { error } = await requireSupabase().auth.signOut();
  if (error) throw error;
}
