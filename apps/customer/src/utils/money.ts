import type { Offer } from '../types/domain';

export const formatINR = (paise: number): string =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: paise % 100 === 0 ? 0 : 2,
  }).format(paise / 100);

export function calculateDiscount(subtotalPaise: number, offer?: Offer | null): number {
  if (!offer || !offer.is_active || subtotalPaise < offer.minimum_order_paise) return 0;
  const raw = offer.discount_type === 'fixed'
    ? offer.discount_value
    : Math.floor((subtotalPaise * offer.discount_value) / 100);
  return Math.max(0, Math.min(raw, offer.maximum_discount_paise ?? raw, subtotalPaise));
}

export function calculateCartTotals(
  lines: Array<{ pricePaise: number; quantity: number }>,
  deliveryFeePaise: number,
  freeDeliveryThresholdPaise: number,
  offer?: Offer | null,
) {
  const subtotalPaise = lines.reduce((sum, line) => sum + line.pricePaise * line.quantity, 0);
  const discountPaise = calculateDiscount(subtotalPaise, offer);
  const chargedDeliveryPaise = subtotalPaise >= freeDeliveryThresholdPaise ? 0 : deliveryFeePaise;
  return {
    subtotalPaise,
    discountPaise,
    deliveryFeePaise: chargedDeliveryPaise,
    totalPaise: subtotalPaise - discountPaise + chargedDeliveryPaise,
  };
}
