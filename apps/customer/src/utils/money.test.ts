import { describe, expect, it } from 'vitest';
import { calculateCartTotals, calculateDiscount, formatINR } from './money';
import type { Offer } from '../types/domain';

const offer = (overrides: Partial<Offer>): Offer => ({ id: '1', name: 'Offer', code: 'SAVE', description: null, discount_type: 'percentage', discount_value: 10, minimum_order_paise: 0, maximum_discount_paise: null, starts_at: null, ends_at: null, is_active: true, ...overrides });

describe('money utilities', () => {
  it('formats Indian currency from integer paise', () => {
    expect(formatINR(129900)).toBe('₹1,299');
    expect(formatINR(4999)).toBe('₹49.99');
  });
  it('calculates percentage, fixed, capped and minimum-order offers', () => {
    expect(calculateDiscount(100000, offer({}))).toBe(10000);
    expect(calculateDiscount(100000, offer({ maximum_discount_paise: 7000 }))).toBe(7000);
    expect(calculateDiscount(100000, offer({ discount_type: 'fixed', discount_value: 15000 }))).toBe(15000);
    expect(calculateDiscount(100000, offer({ minimum_order_paise: 100001 }))).toBe(0);
  });
  it('always provides free delivery and calculates the final total in paise', () => {
    expect(calculateCartTotals([{ pricePaise: 4999, quantity: 2 }], 4000, 79900)).toEqual({ subtotalPaise: 9998, discountPaise: 0, deliveryFeePaise: 0, totalPaise: 9998 });
    expect(calculateCartTotals([{ pricePaise: 40000, quantity: 2 }], 4000, 79900).deliveryFeePaise).toBe(0);
  });
});
