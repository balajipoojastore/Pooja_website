import { DEFAULT_SETTINGS } from '../lib/constants';
import { isSupabaseConfigured, requireSupabase } from '../lib/supabase';
import type { Offer, SiteSettings } from '../types/domain';

const keyMap: Record<string, keyof SiteSettings> = {
  store_name: 'storeName',
  store_tagline: 'tagline',
  header_announcement: 'headerAnnouncement',
  contact_phone: 'contactPhone',
  contact_email: 'contactEmail',
  support_hours: 'supportHours',
  address: 'address',
  location_url: 'locationUrl',
  footer_description: 'footerDescription',
  festival_heading: 'festivalHeading',
  festival_description: 'festivalDescription',
  store_terms: 'terms',
  general_announcement: 'generalAnnouncement',
  reviews: 'reviews',
};

export async function getSiteSettings(): Promise<SiteSettings> {
  if (!isSupabaseConfigured) return DEFAULT_SETTINGS;
  const { data, error } = await requireSupabase().from('site_content').select('*').eq('is_public', true);
  if (error) throw error;
  const settings = { ...DEFAULT_SETTINGS } as Record<string, unknown>;
  for (const row of data ?? []) {
    const target = keyMap[row.content_key];
    if (!target) continue;
    let value: unknown = row.content_value;
    if (row.content_type === 'number') value = Number(row.content_value);
    if (row.content_type === 'json') {
      try { value = JSON.parse(row.content_value); } catch { continue; }
    }
    settings[target] = value;
  }
  return settings as unknown as SiteSettings;
}

export async function listActiveOffers(): Promise<Offer[]> {
  if (!isSupabaseConfigured) return [];
  const now = new Date().toISOString();
  const { data, error } = await requireSupabase()
    .from('offers')
    .select('*')
    .eq('is_active', true)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
