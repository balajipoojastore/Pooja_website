import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(new URL('../../supabase/migrations/202608160001_order_management.sql', import.meta.url), 'utf8');
const pgcryptoFixSql = readFileSync(new URL('../../supabase/migrations/202608160005_fix_cod_order_pgcrypto.sql', import.meta.url), 'utf8');
const downloadableInvoiceSql = readFileSync(new URL('../../supabase/migrations/202608210005_downloadable_pdf_invoices.sql', import.meta.url), 'utf8');

describe('order lifecycle database contract', () => {
  it('enforces only the approved transitions while holding a row lock', () => {
    expect(sql).toContain("where id=p_order_id for update");
    expect(sql).toContain("v_order.status='placed' and p_to_status in ('confirmed','cancelled')");
    expect(sql).toContain("v_order.status='confirmed' and p_to_status in ('out_for_delivery','cancelled')");
    expect(sql).toContain("v_order.status='out_for_delivery' and p_to_status in ('delivered','cancelled')");
    expect(sql).not.toContain("v_order.status='delivered' and");
    expect(sql).not.toContain("v_order.status='cancelled' and");
  });

  it('records initial and admin history in the same database functions', () => {
    expect(sql).toContain("values(v_order_id,null,'placed','checkout')");
    expect(sql).toContain("values(p_order_id,v_order.status,p_to_status,auth.uid(),'admin'");
    expect(sql).toContain('unique(order_id, to_status)');
  });

  it('hashes tracking tokens at checkout', () => {
    expect(sql).toContain("digest(v_tracking_token, 'sha256')");
    expect(sql).toContain('v_tracking_token := encode(gen_random_bytes(32)');
  });

  it('retires external invoice delivery from the current status transition', () => {
    expect(downloadableInvoiceSql).not.toContain('insert into public.invoice_deliveries');
    expect(downloadableInvoiceSql).toContain("'invoice_delivery_id', null");
    expect(downloadableInvoiceSql).toContain("values(p_order_id,v_order.status,p_to_status,auth.uid(),'admin'");
  });

  it('keeps browser roles away from order creation', () => {
    expect(sql).toContain("if auth.role() <> 'service_role'");
    expect(sql).toContain('revoke all on function public.create_cod_order');
  });

  it('schema-qualifies pgcrypto calls under the hardened empty search path', () => {
    expect(pgcryptoFixSql).toContain('extensions.gen_random_bytes(32)');
    expect(pgcryptoFixSql).toContain("extensions.digest(v_tracking_token, 'sha256')");
    expect(pgcryptoFixSql).not.toMatch(/(?<!\.)gen_random_bytes\(32\)/);
  });
});
