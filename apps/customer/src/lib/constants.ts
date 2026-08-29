import type { SiteSettings } from '../types/domain';

export const ACTIVE_CATEGORIES = [
  { name: 'Agarbatti & Dhoop', slug: 'agarbatti-dhoop', folder: 'Agarbatti' },
  { name: 'Brass Items', slug: 'brass-items', folder: 'Brass' },
  { name: 'Lakshmi Items', slug: 'lakshmi-items', folder: 'Lakshmi items' },
  { name: 'Diyas & Wicks', slug: 'diyas-wicks', folder: 'Mud Items' },
  { name: 'Kumkum Haldi Chandan', slug: 'kumkum-haldi-chandan', folder: 'Kumkum Haldi Chandan' },
  { name: 'Oils & Ghee', slug: 'oils-ghee', folder: 'Oils & Ghee' },
] as const;

export const DEFAULT_SETTINGS: SiteSettings = {
  storeName: 'The Pooja House',
  tagline: 'Sacred essentials, thoughtfully brought home.',
  headerAnnouncement: 'Authentic pooja essentials • Cash on Delivery',
  contactPhone: '+91 90000 00000',
  contactEmail: 'care@thepoojahouse.example',
  supportHours: 'Daily, 7 AM – 9 PM',
  address: 'Shop no. 1, sy. No. 61 Ground Floor, Muthsandra Main Rd, Varthur, Bengaluru, Karnataka 560087',
  locationUrl: 'https://maps.app.goo.gl/LpaDsNXq62UnM59X6',
  footerDescription: 'A considered collection for daily rituals, celebrations, and moments of devotion.',
  festivalHeading: 'Auspicious picks for every celebration',
  festivalDescription: 'Bring warmth and tradition home with our seasonal edit.',
  deliveryChargePaise: 0,
  freeDeliveryThresholdPaise: 0,
  terms: 'I agree to the store terms, Cash on Delivery conditions, and the no replacement, return or refund policy after delivery.',
  generalAnnouncement: '',
  reviews: [
    { id: 'review-1', author: 'Ananya R.', rating: 5, quote: 'Beautifully packed and exactly as shown. The brass diya feels special.' },
    { id: 'review-2', author: 'Meera S.', rating: 5, quote: 'Quick delivery and a lovely, thoughtfully selected range.' },
    { id: 'review-3', author: 'Ravi K.', rating: 4, quote: 'Simple ordering, fresh stock, and helpful delivery updates.' },
  ],
};
