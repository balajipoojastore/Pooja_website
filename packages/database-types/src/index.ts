export type OrderStatus = 'placed' | 'confirmed' | 'out_for_delivery' | 'delivered' | 'cancelled';
export type InvoiceDeliveryStatus = 'pending' | 'processing' | 'sent' | 'failed';
export type AdminRole = 'admin' | 'catalog_manager' | 'content_manager';

export interface OrderRow {
  id: string;
  order_number: string;
  full_name: string;
  mobile: string;
  alternate_mobile: string | null;
  email: string | null;
  address_line_1: string;
  address_line_2: string | null;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  delivery_location_url: string | null;
  subtotal_paise: number;
  discount_paise: number;
  delivery_fee_paise: number;
  total_paise: number;
  payment_method: 'cash_on_delivery';
  payment_status: 'pending_cod' | 'collected' | 'cancelled';
  status: OrderStatus;
  customer_notes: string | null;
  offer_code: string | null;
  idempotency_key: string;
  tracking_token_hash: string;
  confirmed_at: string | null;
  out_for_delivery_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  sku: string;
  unit_label: string;
  unit_price_paise: number;
  quantity: number;
  line_total_paise: number;
  created_at: string;
}

export interface OrderStatusHistoryRow {
  id: string;
  order_id: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  changed_by: string | null;
  change_source: 'checkout' | 'admin' | 'system';
  note: string | null;
  changed_at: string;
}

export interface InvoiceDeliveryRow {
  id: string;
  order_id: string;
  channel: 'whatsapp';
  event_type: 'order_confirmed_invoice';
  status: InvoiceDeliveryStatus;
  attempt_count: number;
  provider_message_id: string | null;
  last_error: string | null;
  requested_at: string;
  sent_at: string | null;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      admin_profiles: Table<{ id: string; full_name: string; role: AdminRole; is_active: boolean; created_at: string; updated_at: string }>;
      categories: Table<Record<string, unknown>>;
      products: Table<Record<string, unknown>>;
      product_images: Table<Record<string, unknown>>;
      banners: Table<Record<string, unknown>>;
      offers: Table<Record<string, unknown>>;
      site_content: Table<Record<string, unknown>>;
      serviceable_pincodes: Table<Record<string, unknown>>;
      orders: Table<OrderRow>;
      order_items: Table<OrderItemRow>;
      order_status_history: Table<OrderStatusHistoryRow>;
      invoice_deliveries: Table<InvoiceDeliveryRow>;
    };
    Views: Record<string, never>;
    Functions: Record<string, { Args: Record<string, unknown>; Returns: unknown }>;
    Enums: {
      admin_role: AdminRole;
      order_status: OrderStatus;
      invoice_delivery_status: InvoiceDeliveryStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}

interface Table<Row> {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
}
