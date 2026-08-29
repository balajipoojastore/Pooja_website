export type UUID = string;

export interface Category {
  id: UUID;
  name: string;
  slug: string;
  description: string | null;
  image_path: string | null;
  image_url?: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface Product {
  id: UUID;
  category_id: UUID;
  category?: Pick<Category, 'id' | 'name' | 'slug'> | null;
  sku: string;
  name: string;
  slug: string;
  unit_type: string;
  unit_label: string;
  short_description: string | null;
  description: string | null;
  mrp_paise: number;
  price_paise: number;
  primary_image_path: string | null;
  image_url?: string | null;
  in_stock: boolean;
  stock_status: string;
  delivery_label: string;
  is_popular: boolean;
  is_best_seller: boolean;
  is_recommended: boolean;
  is_festival_product: boolean;
  is_published: boolean;
  sort_order: number;
}

export interface Banner {
  id: UUID;
  title: string;
  subtitle: string | null;
  label: string | null;
  image_path: string | null;
  image_url?: string | null;
  button_text: string | null;
  button_link: string | null;
  placement: string;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  sort_order: number;
}

export type DiscountType = 'fixed' | 'percentage';

export interface Offer {
  id: UUID;
  name: string;
  code: string | null;
  description: string | null;
  discount_type: DiscountType;
  discount_value: number;
  minimum_order_paise: number;
  maximum_discount_paise: number | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
}

export interface ServiceablePincode {
  id: UUID;
  pincode: string;
  area_name: string;
  delivery_fee_paise: number;
  minimum_order_paise: number;
  is_active: boolean;
}

export interface CartLine {
  productId: UUID;
  quantity: number;
}

export interface CartViewLine extends CartLine {
  product: Product;
  lineTotalPaise: number;
}

export interface OrderConfirmation {
  orderId: UUID;
  orderNumber: string;
  totalPaise: number;
  paymentMethod: 'Cash on Delivery';
  trackingToken: string | null;
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  quote: string;
}

export interface SiteSettings {
  storeName: string;
  tagline: string;
  headerAnnouncement: string;
  contactPhone: string;
  contactEmail: string;
  supportHours: string;
  address: string;
  locationUrl: string;
  footerDescription: string;
  festivalHeading: string;
  festivalDescription: string;
  deliveryChargePaise: number;
  freeDeliveryThresholdPaise: number;
  terms: string;
  generalAnnouncement: string;
  reviews: Review[];
}
