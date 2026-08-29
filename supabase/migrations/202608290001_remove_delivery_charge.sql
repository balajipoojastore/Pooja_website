begin;

-- Free delivery is a store-wide rule. Keep the legacy content keys and column
-- for backward compatibility, but prevent CMS or import writes from restoring
-- a charge for new orders.
create or replace function public.force_free_delivery_content()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.content_key in ('delivery_charge_paise', 'free_delivery_threshold_paise') then
    new.content_value := '0';
    new.content_type := 'number';
  end if;
  return new;
end;
$$;

drop trigger if exists site_content_force_free_delivery on public.site_content;
create trigger site_content_force_free_delivery
before insert or update of content_key, content_value, content_type on public.site_content
for each row execute function public.force_free_delivery_content();

create or replace function public.force_free_delivery_area()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.delivery_fee_paise := 0;
  return new;
end;
$$;

drop trigger if exists serviceable_pincodes_force_free_delivery on public.serviceable_pincodes;
create trigger serviceable_pincodes_force_free_delivery
before insert or update of delivery_fee_paise on public.serviceable_pincodes
for each row execute function public.force_free_delivery_area();

-- This insert-only safeguard leaves historic order snapshots unchanged while
-- ensuring every new order remains free even if inserted outside the standard
-- checkout RPC by another trusted server process.
create or replace function public.force_free_delivery_order()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.delivery_fee_paise := 0;
  new.total_paise := new.subtotal_paise - new.discount_paise;
  return new;
end;
$$;

drop trigger if exists orders_force_free_delivery on public.orders;
create trigger orders_force_free_delivery
before insert on public.orders
for each row execute function public.force_free_delivery_order();

insert into public.site_content(section, content_key, content_value, content_type, is_public)
values
  ('delivery', 'delivery_charge_paise', '0', 'number', true),
  ('delivery', 'free_delivery_threshold_paise', '0', 'number', true)
on conflict (content_key) do update
set content_value = '0', content_type = 'number', is_public = true;

update public.serviceable_pincodes
set delivery_fee_paise = 0
where delivery_fee_paise is distinct from 0;

revoke all on function public.force_free_delivery_content() from public, anon, authenticated;
revoke all on function public.force_free_delivery_area() from public, anon, authenticated;
revoke all on function public.force_free_delivery_order() from public, anon, authenticated;

commit;
