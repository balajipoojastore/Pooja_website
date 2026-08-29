export interface ServerProduct { id: string; price_paise: number; is_published: boolean; in_stock: boolean }
export interface ServerLine { product_id: string; quantity: number }
export interface ServerArea { pincode: string; delivery_fee_paise: number; minimum_order_paise: number; is_active: boolean }
export interface ServerOffer { discount_type: 'fixed' | 'percentage'; discount_value: number; minimum_order_paise: number; maximum_discount_paise: number | null; is_active: boolean }

export function calculateAuthoritativeOrder(input: {
  lines: ServerLine[]; products: ServerProduct[]; area: ServerArea | null; offer?: ServerOffer | null; freeDeliveryThresholdPaise: number;
}) {
  if (!input.area?.is_active) throw new Error('Unserviceable PIN code.');
  if (!input.lines.length || input.lines.length > 30) throw new Error('Invalid order items.');
  const ids = new Set<string>();
  let subtotalPaise = 0;
  for (const line of input.lines) {
    if (ids.has(line.product_id)) throw new Error('Duplicate product lines.');
    ids.add(line.product_id);
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 99) throw new Error('Invalid quantity.');
    const product = input.products.find((item) => item.id === line.product_id);
    if (!product || !product.is_published || !product.in_stock || !Number.isInteger(product.price_paise) || product.price_paise < 0) throw new Error('Product unavailable.');
    subtotalPaise += product.price_paise * line.quantity;
    if (!Number.isSafeInteger(subtotalPaise) || subtotalPaise > 2_147_483_647) throw new Error('Order total is too large.');
  }
  if (subtotalPaise < input.area.minimum_order_paise) throw new Error('Minimum order not met.');
  let discountPaise = 0;
  if (input.offer) {
    if (!input.offer.is_active || subtotalPaise < input.offer.minimum_order_paise) throw new Error('Offer unavailable.');
    discountPaise = input.offer.discount_type === 'fixed' ? input.offer.discount_value : Math.floor(subtotalPaise * input.offer.discount_value / 100);
    discountPaise = Math.min(discountPaise, input.offer.maximum_discount_paise ?? discountPaise, subtotalPaise);
  }
  const deliveryFeePaise = subtotalPaise >= input.freeDeliveryThresholdPaise ? 0 : input.area.delivery_fee_paise;
  return { subtotalPaise, discountPaise, deliveryFeePaise, totalPaise: subtotalPaise - discountPaise + deliveryFeePaise };
}
