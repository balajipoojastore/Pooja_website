import type { OrderConfirmation } from '../types/domain';

export const LAST_ORDER_STORAGE_KEY = 'pooja-house-last-order';

export type StoredOrderConfirmation = {
  customerId: string;
  confirmation: OrderConfirmation;
};

export function storeOrderConfirmation(customerId: string, confirmation: OrderConfirmation): StoredOrderConfirmation {
  const stored = { customerId, confirmation } satisfies StoredOrderConfirmation;
  sessionStorage.setItem(LAST_ORDER_STORAGE_KEY, JSON.stringify(stored));
  return stored;
}

export function consumeOrderConfirmation(customerId: string): OrderConfirmation | null {
  const raw = sessionStorage.getItem(LAST_ORDER_STORAGE_KEY);
  sessionStorage.removeItem(LAST_ORDER_STORAGE_KEY);
  if (!raw) return null;
  try {
    const stored = JSON.parse(raw) as Partial<StoredOrderConfirmation>;
    return stored.customerId === customerId && stored.confirmation ? stored.confirmation : null;
  } catch {
    return null;
  }
}

export function clearOrderConfirmation(): void {
  sessionStorage.removeItem(LAST_ORDER_STORAGE_KEY);
}
