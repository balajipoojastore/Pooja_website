import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const query: Record<string, ReturnType<typeof vi.fn>> = {};
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.order = vi.fn(() => query);
  query.limit = vi.fn(async () => ({
    data: [{ id: 'order-a', order_number: 'TPH-20260830-000001', status: 'placed', total_paise: 59900, created_at: '2026-08-30T00:00:00Z', updated_at: '2026-08-30T00:00:00Z', order_items: [] }],
    error: null,
  }));
  const client = {
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'customer-a' } }, error: null })) },
    from: vi.fn(() => query),
  };
  return { client, query };
});

vi.mock('../lib/supabase', () => ({ requireSupabase: () => mocks.client }));

import { listMyOrders } from './customerOrderService';

describe('customer order isolation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('always scopes My Orders to the verified Supabase user ID', async () => {
    const orders = await listMyOrders();

    expect(mocks.client.auth.getUser).toHaveBeenCalledOnce();
    expect(mocks.query.eq).toHaveBeenCalledWith('customer_id', 'customer-a');
    expect(orders).toHaveLength(1);
  });
});
