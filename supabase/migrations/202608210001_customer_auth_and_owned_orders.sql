begin;

create table if not exists public.customer_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 2 and 100),
  phone text not null check (phone ~ '^[6-9][0-9]{9}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Home' check (char_length(trim(label)) between 1 and 30),
  address_line_1 text not null check (char_length(trim(address_line_1)) between 5 and 200),
  address_line_2 text check (address_line_2 is null or char_length(address_line_2) <= 200),
  landmark text check (landmark is null or char_length(landmark) <= 120),
  city text not null check (char_length(trim(city)) between 2 and 80),
  state text not null check (char_length(trim(state)) between 2 and 80),
  pincode text not null check (pincode ~ '^[0-9]{6}$'),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists customer_addresses_one_default_idx
  on public.customer_addresses(customer_id) where is_default;
create index if not exists customer_addresses_customer_idx
  on public.customer_addresses(customer_id, created_at desc);

alter table public.orders add column if not exists customer_id uuid references auth.users(id) on delete set null;
create index if not exists orders_customer_created_idx on public.orders(customer_id, created_at desc);

drop trigger if exists customer_profiles_updated on public.customer_profiles;
create trigger customer_profiles_updated before update on public.customer_profiles
for each row execute function public.set_updated_at();
drop trigger if exists customer_addresses_updated on public.customer_addresses;
create trigger customer_addresses_updated before update on public.customer_addresses
for each row execute function public.set_updated_at();

alter table public.customer_profiles enable row level security;
alter table public.customer_addresses enable row level security;

drop policy if exists "customers read own profile" on public.customer_profiles;
create policy "customers read own profile" on public.customer_profiles for select to authenticated
using (id = (select auth.uid()));
drop policy if exists "customers update own profile" on public.customer_profiles;
create policy "customers update own profile" on public.customer_profiles for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));
drop policy if exists "admins read customer profiles" on public.customer_profiles;
create policy "admins read customer profiles" on public.customer_profiles for select to authenticated
using (public.is_active_admin());

drop policy if exists "customers read own addresses" on public.customer_addresses;
create policy "customers read own addresses" on public.customer_addresses for select to authenticated
using (customer_id = (select auth.uid()));
drop policy if exists "customers insert own addresses" on public.customer_addresses;
create policy "customers insert own addresses" on public.customer_addresses for insert to authenticated
with check (customer_id = (select auth.uid()));
drop policy if exists "customers update own addresses" on public.customer_addresses;
create policy "customers update own addresses" on public.customer_addresses for update to authenticated
using (customer_id = (select auth.uid())) with check (customer_id = (select auth.uid()));
drop policy if exists "customers delete own addresses" on public.customer_addresses;
create policy "customers delete own addresses" on public.customer_addresses for delete to authenticated
using (customer_id = (select auth.uid()));
drop policy if exists "admins read customer addresses" on public.customer_addresses;
create policy "admins read customer addresses" on public.customer_addresses for select to authenticated
using (public.is_active_admin());

drop policy if exists "customers read own orders" on public.orders;
create policy "customers read own orders" on public.orders for select to authenticated
using (customer_id = (select auth.uid()));
drop policy if exists "customers read own order items" on public.order_items;
create policy "customers read own order items" on public.order_items for select to authenticated
using (exists (select 1 from public.orders o where o.id = order_items.order_id and o.customer_id = (select auth.uid())));
create or replace function public.complete_customer_signup(
  p_full_name text,
  p_phone text,
  p_address jsonb
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_customer_id uuid := auth.uid();
  v_profile public.customer_profiles%rowtype;
  v_address public.customer_addresses%rowtype;
  v_pincode text := regexp_replace(coalesce(p_address->>'pincode', ''), '[^0-9]', '', 'g');
  v_profile_existed boolean;
begin
  if v_customer_id is null or auth.role() <> 'authenticated' then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_full_name, ''))) not between 2 and 100 then raise exception 'invalid full name'; end if;
  if coalesce(p_phone, '') !~ '^[6-9][0-9]{9}$' then raise exception 'invalid mobile number'; end if;
  if v_pincode !~ '^[0-9]{6}$' then raise exception 'invalid pincode'; end if;
  if char_length(trim(coalesce(p_address->>'address_line_1', ''))) not between 5 and 200
    or char_length(trim(coalesce(p_address->>'city', ''))) not between 2 and 80
    or char_length(trim(coalesce(p_address->>'state', ''))) not between 2 and 80 then
    raise exception 'invalid address';
  end if;
  if not exists (select 1 from public.serviceable_pincodes where pincode = v_pincode and is_active) then
    raise exception 'unserviceable pincode';
  end if;

  select exists(select 1 from public.customer_profiles where id = v_customer_id) into v_profile_existed;
  insert into public.customer_profiles(id, full_name, phone)
  values (v_customer_id, trim(p_full_name), p_phone)
  on conflict (id) do nothing;
  select * into strict v_profile from public.customer_profiles where id = v_customer_id;

  select * into v_address from public.customer_addresses
  where customer_id = v_customer_id and is_default limit 1;
  if not found then
    insert into public.customer_addresses(
      customer_id,label,address_line_1,address_line_2,landmark,city,state,pincode,is_default
    ) values (
      v_customer_id, coalesce(nullif(trim(p_address->>'label'), ''), 'Home'),
      trim(p_address->>'address_line_1'), nullif(trim(p_address->>'address_line_2'), ''),
      nullif(trim(p_address->>'landmark'), ''), trim(p_address->>'city'), trim(p_address->>'state'),
      v_pincode, true
    ) returning * into v_address;
  end if;

  return jsonb_build_object(
    'profile_id', v_profile.id,
    'address_id', v_address.id,
    'profile_existed', v_profile_existed,
    'profile_complete', true
  );
end;
$$;
revoke all on function public.complete_customer_signup(text,text,jsonb) from public, anon;
grant execute on function public.complete_customer_signup(text,text,jsonb) to authenticated;

create or replace function public.create_authenticated_cod_order(
  p_customer_id uuid,
  p_address_id uuid,
  p_items jsonb,
  p_offer_code text,
  p_idempotency_key uuid,
  p_customer_notes text default null
) returns table(order_id uuid, order_number text, total_paise integer, payment_method text, tracking_token text)
language plpgsql security definer set search_path = '' as $$
declare
  v_existing public.orders%rowtype;
  v_profile public.customer_profiles%rowtype;
  v_address public.customer_addresses%rowtype;
  v_area public.serviceable_pincodes%rowtype;
  v_offer public.offers%rowtype;
  v_item jsonb;
  v_product public.products%rowtype;
  v_order_id uuid;
  v_order_number text;
  v_email text;
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
  if p_customer_id is null or p_address_id is null then raise exception 'authenticated customer required' using errcode='42501'; end if;
  select * into v_existing from public.orders where idempotency_key=p_idempotency_key;
  if found then
    if v_existing.customer_id is distinct from p_customer_id then raise exception 'idempotency key unavailable' using errcode='42501'; end if;
    return query select v_existing.id,v_existing.order_number,v_existing.total_paise,'Cash on Delivery'::text,null::text;
    return;
  end if;
  select * into v_profile from public.customer_profiles where id=p_customer_id;
  if not found then raise exception 'customer profile incomplete'; end if;
  select * into v_address from public.customer_addresses where id=p_address_id and customer_id=p_customer_id;
  if not found then raise exception 'delivery address unavailable'; end if;
  select email into v_email from auth.users where id=p_customer_id;
  if v_email is null then raise exception 'verified email required'; end if;
  select * into v_area from public.serviceable_pincodes where pincode=v_address.pincode and is_active for share;
  if not found then raise exception 'unserviceable pincode'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 30 then raise exception 'invalid order payload'; end if;
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
    select * into v_offer from public.offers where code=upper(trim(p_offer_code)) and is_active
      and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>=now()) for share;
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
  v_tracking_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_tracking_hash := encode(extensions.digest(v_tracking_token, 'sha256'), 'hex');
  insert into public.orders(
    id,customer_id,order_number,full_name,mobile,email,address_line_1,address_line_2,landmark,city,state,pincode,
    subtotal_paise,discount_paise,delivery_fee_paise,total_paise,payment_method,payment_status,status,
    customer_notes,offer_code,idempotency_key,tracking_token_hash
  ) values (
    v_order_id,p_customer_id,v_order_number,v_profile.full_name,v_profile.phone,v_email,
    v_address.address_line_1,v_address.address_line_2,v_address.landmark,v_address.city,v_address.state,v_address.pincode,
    v_subtotal::integer,v_discount::integer,v_delivery,v_total::integer,'cash_on_delivery','pending_cod','placed',
    nullif(trim(p_customer_notes),''),nullif(upper(trim(p_offer_code)),''),p_idempotency_key,v_tracking_hash
  );
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
  if found and v_existing.customer_id = p_customer_id then
    return query select v_existing.id,v_existing.order_number,v_existing.total_paise,'Cash on Delivery'::text,null::text;
  else
    raise;
  end if;
end;
$$;
revoke all on function public.create_authenticated_cod_order(uuid,uuid,jsonb,text,uuid,text) from public, anon, authenticated;
grant execute on function public.create_authenticated_cod_order(uuid,uuid,jsonb,text,uuid,text) to service_role;

-- The unauthenticated order RPC remains in migration history, but is no longer callable.
revoke all on function public.create_cod_order(jsonb,jsonb,text,uuid) from public, anon, authenticated, service_role;

commit;
