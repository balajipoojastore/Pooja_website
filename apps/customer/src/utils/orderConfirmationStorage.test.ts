import { beforeEach, describe, expect, it } from 'vitest';
import type { OrderConfirmation } from '../types/domain';
import { clearOrderConfirmation, consumeOrderConfirmation, LAST_ORDER_STORAGE_KEY, storeOrderConfirmation } from './orderConfirmationStorage';

const confirmation: OrderConfirmation = {
  orderId: '00000000-0000-4000-8000-000000000001',
  orderNumber: 'TPH-TEST-REDACTED',
  totalPaise: 59900,
  paymentMethod: 'Cash on Delivery',
  trackingToken: 'test-token-never-used-outside-jsdom',
};

describe('order confirmation session privacy', () => {
  beforeEach(() => sessionStorage.clear());

  it('returns a confirmation only to its customer and consumes it once', () => {
    storeOrderConfirmation('customer-a', confirmation);
    expect(consumeOrderConfirmation('customer-b')).toBeNull();
    expect(sessionStorage.getItem(LAST_ORDER_STORAGE_KEY)).toBeNull();

    storeOrderConfirmation('customer-a', confirmation);
    expect(consumeOrderConfirmation('customer-a')).toEqual(confirmation);
    expect(consumeOrderConfirmation('customer-a')).toBeNull();
  });

  it('clears a stored tracking secret explicitly', () => {
    storeOrderConfirmation('customer-a', confirmation);
    clearOrderConfirmation();
    expect(sessionStorage.getItem(LAST_ORDER_STORAGE_KEY)).toBeNull();
  });
});
