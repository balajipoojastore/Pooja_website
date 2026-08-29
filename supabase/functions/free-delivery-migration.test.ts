import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('free delivery migration', () => {
  const sql = readFileSync(resolve('supabase/migrations/202608290001_remove_delivery_charge.sql'), 'utf8');

  it('forces CMS values, delivery areas, and all new orders to zero delivery fee', () => {
    expect(sql).toContain("new.content_value := '0'");
    expect(sql).toContain('new.delivery_fee_paise := 0');
    expect(sql).toContain('new.total_paise := new.subtotal_paise - new.discount_paise');
    expect(sql).toContain('before insert on public.orders');
  });

  it('preserves the independently enforced minimum purchase', () => {
    expect(sql).not.toContain('minimum_order_paise = 0');
  });
});
