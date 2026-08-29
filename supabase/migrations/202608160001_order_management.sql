begin;

-- Replace the first-release status enum so only the approved lifecycle remains.
alter type public.order_status rename to order_status_legacy;
create type public.order_status as enum ('placed', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled');
alter table public.orders alter column order_status drop default;
alter table public.orders alter column order_status type public.order_status
  using (case when order_status::text = 'preparing' then 'confirmed' else order_status::text end)::public.order_status;
alter table public.orders rename column order_status to status;
alter table public.orders alter column status set default 'placed'::public.order_status;
drop type public.order_status_legacy;

alter table public.orders
  add column tracking_token_hash text,
  add column confirmed_at timestamptz,
  add column out_for_delivery_at timestamptz,
  add column delivered_at timestamptz,
  add column cancelled_at timestamptz;

-- Historic records cannot reveal a raw token; give them an irrecoverable hash and
-- allow customers to track only orders created by the upgraded checkout flow.
update public.orders
set tracking_token_hash = encode(digest(id::text || ':' || gen_random_uuid()::text, 'sha256'), 'hex')
where tracking_token_hash is null;
alter table public.orders alter column tracking_token_hash set not null;
alter table public.orders add constraint orders_tracking_hash_format check (tracking_token_hash ~ '^[a-f0-9]{64}$');

create type public.order_change_source as enum ('checkout', 'admin', 'system');
create type public.invoice_delivery_status as enum ('pending', 'processing', 'sent', 'failed');

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  from_status public.order_status,
  to_status public.order_status not null,
  changed_by uuid references auth.users(id) on delete set null,
  change_source public.order_change_source not null,
  note text check (note is null or char_length(note) <= 500),
  changed_at timestamptz not null default now(),
  unique(order_id, to_status)
);

insert into public.order_status_history(order_id, from_status, to_status, change_source, note, changed_at)
select id, null, status, 'system', 'History initialized during order-management migration.', created_at
from public.orders
on conflict(order_id, to_status) do nothing;

create table public.invoice_deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  channel text not null default 'whatsapp' check (channel = 'whatsapp'),
  event_type text not null default 'order_confirmed_invoice' check (event_type = 'order_confirmed_invoice'),
  status public.invoice_delivery_status not null default 'pending',
  attempt_count integer not null default 0 check (attempt_count between 0 and 3),
  provider_message_id text,
  last_error text check (last_error is null or char_length(last_error) <= 1000),
  requested_at timestamptz not null default now(),
  sent_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(order_id, channel, event_type),
  check ((status = 'sent' and sent_at is not null and provider_message_id is not null) or status <> 'sent')
);

create trigger invoice_deliveries_updated before update on public.invoice_deliveries
for each row execute function public.set_updated_at();

create index orders_status_created_idx on public.orders(status, created_at desc);
create index orders_name_search_idx on public.orders using gin(to_tsvector('simple', coalesce(full_name,'') || ' ' || coalesce(order_number,'') || ' ' || coalesce(mobile,'')));
create index order_status_history_order_idx on public.order_status_history(order_id, changed_at);
create index invoice_deliveries_queue_idx on public.invoice_deliveries(status, requested_at) where status in ('pending', 'failed');

alter table public.order_status_history enable row level security;
alter table public.invoice_deliveries enable row level security;
create policy "admins read order status history" on public.order_status_history for select to authenticated using (public.is_active_admin());
create policy "admins read invoice deliveries" on public.invoice_deliveries for select to authenticated using (public.is_active_admin());
revoke insert, update, delete on public.order_status_history from anon, authenticated;
revoke insert, update, delete on public.invoice_deliveries from anon, authenticated;

do $$ begin
  alter publication supabase_realtime add table public.orders;
exception when duplicate_object then null;
end $$;

drop function public.create_cod_order(jsonb,jsonb,text,uuid);
create function public.create_cod_order(
  p_customer jsonb,
  p_items jsonb,
  p_offer_code text,
  p_idempotency_key uuid
) returns table(order_id uuid, order_number text, total_paise integer, payment_method text, tracking_token text)
language plpgsql security definer set search_path = '' as $$
declare
  v_existing public.orders%rowtype;
  v_area public.serviceable_pincodes%rowtype;
  v_offer public.offers%rowtype;
  v_item jsonb;
  v_product public.products%rowtype;
  v_order_id uuid;
  v_order_number text;
  v_tracking_token text;
  v_tracking_hash text;
  v_subtotal bigint := 0;
  v_discount bigint := 0;
  v_delivery integer := 0;
  v_total bigint;
  v_free_threshold integer := 2147483647;
  v_quantity integer;
  v_product_id uuid;
begin
  if auth.role() <> 'service_role' then raise exception 'order endpoint only' using errcode='42501'; end if;
  select * into v_existing from public.orders where idempotency_key=p_idempotency_key;
  if found then
    return query select v_existing.id,v_existing.order_number,v_existing.total_paise,'Cash on Delivery'::text,null::text;
    return;
  end if;
  if jsonb_typeof(p_customer) <> 'object' or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 30 then raise exception 'invalid order payload'; end if;
  if coalesce((p_customer->>'terms_accepted')::boolean,false) is not true then raise exception 'terms must be accepted'; end if;
  if coalesce(p_customer->>'full_name','') !~ '^.{2,100}$' or coalesce(p_customer->>'mobile','') !~ '^[6-9][0-9]{9}$' or coalesce(p_customer->>'pincode','') !~ '^[0-9]{6}$' then raise exception 'invalid customer details'; end if;
  if nullif(p_customer->>'alternate_mobile','') is not null and (p_customer->>'alternate_mobile') !~ '^[6-9][0-9]{9}$' then raise exception 'invalid alternate mobile'; end if;
  if char_length(trim(coalesce(p_customer->>'address_line_1',''))) < 5 or char_length(trim(coalesce(p_customer->>'city',''))) < 2 or char_length(trim(coalesce(p_customer->>'state',''))) < 2 then raise exception 'invalid delivery address'; end if;
  select * into v_area from public.serviceable_pincodes where pincode=p_customer->>'pincode' and is_active for share;
  if not found then raise exception 'unserviceable pincode'; end if;
  if (select count(*) from jsonb_array_elements(p_items)) <> (select count(distinct value->>'product_id') from jsonb_array_elements(p_items)) then raise exception 'duplicate product lines'; end if;
  for v_item in select value from jsonb_array_elements(p_items) loop
    begin v_product_id := (v_item->>'product_id')::uuid; v_quantity := (v_item->>'quantity')::integer; exception when others then raise exception 'invalid product or quantity'; end;
    if v_quantity not between 1 and 99 then raise exception 'invalid quantity'; end if;
    select * into v_product from public.products where id=v_product_id and is_published and in_stock for share;
    if not found then raise exception 'product unavailable'; end if;
    v_subtotal := v_subtotal + (v_product.price_paise::bigint * v_quantity);
    if v_subtotal > 2147483647 then raise exception 'order total too large'; end if;
  end loop;
  if v_subtotal < v_area.minimum_order_paise then raise exception 'minimum order not met'; end if;
  if nullif(trim(coalesce(p_offer_code,'')),'') is not null then
    select * into v_offer from public.offers where code=upper(trim(p_offer_code)) and is_active and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>=now()) for share;
    if not found or v_subtotal < v_offer.minimum_order_paise then raise exception 'offer unavailable'; end if;
    v_discount := case when v_offer.discount_type='fixed' then v_offer.discount_value else floor(v_subtotal*v_offer.discount_value/100.0) end;
    if v_offer.maximum_discount_paise is not null then v_discount := least(v_discount,v_offer.maximum_discount_paise); end if;
    v_discount := least(v_discount,v_subtotal);
  end if;
  select coalesce(nullif(content_value,''),'2147483647')::integer into v_free_threshold from public.site_content where content_key='free_delivery_threshold_paise';
  v_delivery := case when v_subtotal >= coalesce(v_free_threshold,2147483647) then 0 else v_area.delivery_fee_paise end;
  v_total := v_subtotal-v_discount+v_delivery;
  v_order_id := gen_random_uuid();
  v_order_number := 'TPH-' || to_char(now(),'YYYYMMDD') || '-' || lpad(nextval('public.order_number_seq')::text,6,'0');
  v_tracking_token := encode(gen_random_bytes(32), 'hex');
  v_tracking_hash := encode(digest(v_tracking_token, 'sha256'), 'hex');
  insert into public.orders(id,order_number,full_name,mobile,alternate_mobile,email,address_line_1,address_line_2,landmark,city,state,pincode,subtotal_paise,discount_paise,delivery_fee_paise,total_paise,payment_method,payment_status,status,customer_notes,offer_code,idempotency_key,tracking_token_hash)
  values(v_order_id,v_order_number,trim(p_customer->>'full_name'),p_customer->>'mobile',nullif(trim(p_customer->>'alternate_mobile'),''),nullif(trim(p_customer->>'email'),''),trim(p_customer->>'address_line_1'),nullif(trim(p_customer->>'address_line_2'),''),nullif(trim(p_customer->>'landmark'),''),trim(p_customer->>'city'),trim(p_customer->>'state'),p_customer->>'pincode',v_subtotal::integer,v_discount::integer,v_delivery,v_total::integer,'cash_on_delivery','pending_cod','placed',nullif(trim(p_customer->>'delivery_instructions'),''),nullif(upper(trim(p_offer_code)),''),p_idempotency_key,v_tracking_hash);
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_product_id := (v_item->>'product_id')::uuid; v_quantity := (v_item->>'quantity')::integer;
    select * into strict v_product from public.products where id=v_product_id and is_published and in_stock;
    insert into public.order_items(order_id,product_id,product_name,sku,unit_label,unit_price_paise,quantity,line_total_paise)
    values(v_order_id,v_product.id,v_product.name,v_product.sku,v_product.unit_label,v_product.price_paise,v_quantity,v_product.price_paise*v_quantity);
  end loop;
  insert into public.order_status_history(order_id,from_status,to_status,change_source)
  values(v_order_id,null,'placed','checkout');
  return query select v_order_id,v_order_number,v_total::integer,'Cash on Delivery'::text,v_tracking_token;
exception when unique_violation then
  select * into v_existing from public.orders where idempotency_key=p_idempotency_key;
  if found then return query select v_existing.id,v_existing.order_number,v_existing.total_paise,'Cash on Delivery'::text,null::text; else raise; end if;
end;
$$;
revoke all on function public.create_cod_order(jsonb,jsonb,text,uuid) from public, anon, authenticated;
grant execute on function public.create_cod_order(jsonb,jsonb,text,uuid) to service_role;

create function public.transition_order_status(p_order_id uuid, p_to_status public.order_status, p_note text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders%rowtype;
  v_delivery_id uuid;
begin
  if not public.is_active_admin(auth.uid()) then raise exception 'administrator access required' using errcode='42501'; end if;
  if p_note is not null and char_length(trim(p_note)) > 500 then raise exception 'status note is too long'; end if;
  select * into v_order from public.orders where id=p_order_id for update;
  if not found then raise exception 'order not found'; end if;
  if not (
    (v_order.status='placed' and p_to_status in ('confirmed','cancelled')) or
    (v_order.status='confirmed' and p_to_status in ('out_for_delivery','cancelled')) or
    (v_order.status='out_for_delivery' and p_to_status in ('delivered','cancelled'))
  ) then raise exception 'invalid order status transition from % to %', v_order.status, p_to_status using errcode='22023'; end if;

  update public.orders set
    status=p_to_status,
    confirmed_at=case when p_to_status='confirmed' then now() else confirmed_at end,
    out_for_delivery_at=case when p_to_status='out_for_delivery' then now() else out_for_delivery_at end,
    delivered_at=case when p_to_status='delivered' then now() else delivered_at end,
    cancelled_at=case when p_to_status='cancelled' then now() else cancelled_at end,
    payment_status=case when p_to_status='delivered' then 'collected'::public.payment_status when p_to_status='cancelled' then 'cancelled'::public.payment_status else payment_status end
  where id=p_order_id;

  insert into public.order_status_history(order_id,from_status,to_status,changed_by,change_source,note)
  values(p_order_id,v_order.status,p_to_status,auth.uid(),'admin',nullif(trim(p_note),''));

  if p_to_status='confirmed' then
    insert into public.invoice_deliveries(order_id) values(p_order_id)
    on conflict(order_id,channel,event_type) do nothing
    returning id into v_delivery_id;
  end if;

  return jsonb_build_object(
    'order_id', p_order_id,
    'from_status', v_order.status,
    'to_status', p_to_status,
    'invoice_delivery_id', v_delivery_id,
    'updated_at', now()
  );
end;
$$;
revoke all on function public.transition_order_status(uuid,public.order_status,text) from public, anon;
grant execute on function public.transition_order_status(uuid,public.order_status,text) to authenticated;

create function public.get_order_dashboard_summary()
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when public.is_active_admin(auth.uid()) then jsonb_build_object(
    'today_count', count(*) filter (where created_at >= date_trunc('day', now())),
    'week_count', count(*) filter (where created_at >= date_trunc('week', now())),
    'placed_count', count(*) filter (where status='placed'),
    'confirmed_count', count(*) filter (where status='confirmed'),
    'out_for_delivery_count', count(*) filter (where status='out_for_delivery'),
    'delivered_count', count(*) filter (where status='delivered'),
    'cancelled_count', count(*) filter (where status='cancelled'),
    'today_delivered_revenue_paise', coalesce(sum(total_paise) filter (where status='delivered' and delivered_at >= date_trunc('day', now())),0),
    'week_delivered_revenue_paise', coalesce(sum(total_paise) filter (where status='delivered' and delivered_at >= date_trunc('week', now())),0)
  ) else null end from public.orders;
$$;
revoke all on function public.get_order_dashboard_summary() from public, anon;
grant execute on function public.get_order_dashboard_summary() to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('invoices','invoices',false,5242880,array['application/pdf'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

commit;
