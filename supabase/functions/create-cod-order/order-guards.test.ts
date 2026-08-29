import { describe, expect, it } from 'vitest';
import { calculateAuthoritativeOrder } from './order-guards';

const products = [{ id: 'p1', price_paise: 5000, is_published: true, in_stock: true }];
const area = { pincode: '560001', delivery_fee_paise: 3000, minimum_order_paise: 5000, is_active: true };

describe('authoritative COD calculations', () => {
  it('calculates only from authoritative product and delivery records', () => {
    expect(calculateAuthoritativeOrder({ lines: [{ product_id: 'p1', quantity: 2 }], products, area })).toEqual({ subtotalPaise: 10000, discountPaise: 0, deliveryFeePaise: 0, totalPaise: 10000 });
  });
  it('recalculates valid server-side offers', () => {
    const result = calculateAuthoritativeOrder({ lines: [{ product_id: 'p1', quantity: 2 }], products, area, offer: { discount_type: 'percentage', discount_value: 10, minimum_order_paise: 5000, maximum_discount_paise: 700, is_active: true } });
    expect(result.discountPaise).toBe(700);
    expect(result.totalPaise).toBe(9300);
  });
  it('rejects unpublished, unavailable, invalid, duplicate and unknown products', () => {
    expect(() => calculateAuthoritativeOrder({ lines: [{ product_id: 'p1', quantity: 1 }], products: [{ ...products[0]!, is_published: false }], area })).toThrow('Product unavailable');
    expect(() => calculateAuthoritativeOrder({ lines: [{ product_id: 'p1', quantity: 1 }], products: [{ ...products[0]!, in_stock: false }], area })).toThrow('Product unavailable');
    expect(() => calculateAuthoritativeOrder({ lines: [{ product_id: 'missing', quantity: 1 }], products, area })).toThrow('Product unavailable');
    expect(() => calculateAuthoritativeOrder({ lines: [{ product_id: 'p1', quantity: 1 }, { product_id: 'p1', quantity: 1 }], products, area })).toThrow('Duplicate');
  });
  it('rejects inactive or absent delivery PIN codes and minimum-order failures', () => {
    expect(() => calculateAuthoritativeOrder({ lines: [{ product_id: 'p1', quantity: 1 }], products, area: null })).toThrow('Unserviceable');
    expect(() => calculateAuthoritativeOrder({ lines: [{ product_id: 'p1', quantity: 1 }], products, area: { ...area, minimum_order_paise: 6000 } })).toThrow('Minimum order');
  });
});
