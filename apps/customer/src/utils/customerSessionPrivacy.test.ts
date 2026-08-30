import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { clearCustomerSessionCache } from './customerSessionPrivacy';

describe('customer session query privacy', () => {
  it('removes cached orders and other server data when the customer changes', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['my-orders', 'customer-a'], [{ order_number: 'PRIVATE-A' }]);
    queryClient.setQueryData(['site-settings'], { storeName: 'Public content' });

    clearCustomerSessionCache(queryClient);

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });
});
