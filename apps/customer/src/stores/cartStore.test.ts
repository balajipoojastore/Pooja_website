import { beforeEach, describe, expect, it } from 'vitest';
import { useCartStore } from './cartStore';

describe('persistent cart store', () => {
  beforeEach(() => { localStorage.clear(); useCartStore.setState({ lines: [], isDrawerOpen: false }); });
  it('adds products and changes quantities without exceeding limits', () => {
    useCartStore.getState().add('product-1');
    useCartStore.getState().add('product-1', 2);
    expect(useCartStore.getState().lines).toEqual([{ productId: 'product-1', quantity: 3 }]);
    useCartStore.getState().setQuantity('product-1', 2);
    expect(useCartStore.getState().lines[0]?.quantity).toBe(2);
    useCartStore.getState().setQuantity('product-1', 0);
    expect(useCartStore.getState().lines).toEqual([]);
  });
  it('persists only product IDs and quantities, never prices', () => {
    useCartStore.getState().add('product-2', 3);
    const persisted = localStorage.getItem('pooja-house-cart') ?? '';
    expect(persisted).toContain('product-2');
    expect(persisted).toContain('"quantity":3');
    expect(persisted).not.toContain('price');
  });
});
