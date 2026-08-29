begin;

create extension if not exists pgcrypto;

create type public.admin_role as enum ('admin', 'catalog_manager', 'content_manager');
create type public.discount_type as enum ('fixed', 'percentage');
create type public.content_type as enum ('text', 'number', 'boolean', 'json');
create type public.payment_method as enum ('cash_on_delivery');
create type public.payment_status as enum ('pending_cod', 'collected', 'cancelled');
create type public.order_status as enum ('placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled');

create table public.admin_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 2 and 100),
  role public.admin_role not null default 'content_manager',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(trim(name)) between 2 and 100),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  image_path text,
  is_active boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete restrict,
  sku text not null unique check (char_length(trim(sku)) between 1 and 64),
  name text not null check (char_length(trim(name)) between 2 and 200),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  unit_type text not null check (char_length(trim(unit_type)) between 1 and 50),
  unit_label text not null check (char_length(trim(unit_label)) between 1 and 100),
  short_description text,
  description text,
  mrp_paise integer not null check (mrp_paise >= 0),
  price_paise integer not null check (price_paise >= 0 and price_paise <= mrp_paise),
  primary_image_path text,
  in_stock boolean not null default true,
  stock_status text not null default 'In stock',
  delivery_label text not null default 'Delivery in 1–3 days',
  is_popular boolean not null default false,
  is_best_seller boolean not null default false,
  is_recommended boolean not null default false,
  is_festival_product boolean not null default false,
  is_published boolean not null default false,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  alt_text text not null default '',
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id, storage_path)
);

create table public.catalog_import_issues (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  sku text not null,
  issue_code text not null,
  source_payload jsonb not null default '{}'::jsonb,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(sku, issue_code)
);

create table public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 2 and 160),
  subtitle text,
  label text,
  image_path text,
  button_text text,
  button_link text,
  placement text not null default 'home_hero' check (placement in ('home_hero', 'home_inline')),
  is_active boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  code text unique check (code is null or code ~ '^[A-Z0-9_-]{3,32}$'),
  description text,
  discount_type public.discount_type not null,
  discount_value integer not null check (discount_value > 0),
  minimum_order_paise integer not null default 0 check (minimum_order_paise >= 0),
  maximum_discount_paise integer check (maximum_discount_paise is null or maximum_discount_paise > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (discount_type <> 'percentage' or discount_value <= 100),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table public.site_content (
  id uuid primary key default gen_random_uuid(),
  section text not null check (section ~ '^[a-z][a-z0-9_]{1,49}$'),
  content_key text not null check (content_key ~ '^[a-z][a-z0-9_]{1,79}$'),
  content_value text not null default '',
  content_type public.content_type not null default 'text',
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(section, content_key),
  unique(content_key)
);

create table public.serviceable_pincodes (
  id uuid primary key default gen_random_uuid(),
  pincode text not null unique check (pincode ~ '^[0-9]{6}$'),
  area_name text not null check (char_length(trim(area_name)) between 2 and 120),
  delivery_fee_paise integer not null default 0 check (delivery_fee_paise >= 0),
  minimum_order_paise integer not null default 0 check (minimum_order_paise >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create sequence public.order_number_seq;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  full_name text not null check (char_length(trim(full_name)) between 2 and 100),
  mobile text not null check (mobile ~ '^[6-9][0-9]{9}$'),
  alternate_mobile text check (alternate_mobile is null or alternate_mobile ~ '^[6-9][0-9]{9}$'),
  email text check (email is null or (char_length(email) <= 254 and email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')),
  address_line_1 text not null check (char_length(trim(address_line_1)) between 5 and 200),
  address_line_2 text check (address_line_2 is null or char_length(address_line_2) <= 200),
  landmark text check (landmark is null or char_length(landmark) <= 120),
  city text not null check (char_length(trim(city)) between 2 and 80),
  state text not null check (char_length(trim(state)) between 2 and 80),
  pincode text not null check (pincode ~ '^[0-9]{6}$'),
  subtotal_paise integer not null check (subtotal_paise >= 0),
  discount_paise integer not null default 0 check (discount_paise >= 0 and discount_paise <= subtotal_paise),
  delivery_fee_paise integer not null default 0 check (delivery_fee_paise >= 0),
  total_paise integer not null check (total_paise = subtotal_paise - discount_paise + delivery_fee_paise),
  payment_method public.payment_method not null default 'cash_on_delivery',
  payment_status public.payment_status not null default 'pending_cod',
  order_status public.order_status not null default 'placed',
  customer_notes text check (customer_notes is null or char_length(customer_notes) <= 500),
  offer_code text,
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  sku text not null,
  unit_label text not null,
  unit_price_paise integer not null check (unit_price_paise >= 0),
  quantity integer not null check (quantity between 1 and 99),
  line_total_paise integer not null check (line_total_paise = unit_price_paise * quantity),
  created_at timestamptz not null default now()
);

create table public.order_submission_attempts (
  id bigint generated always as identity primary key,
  request_fingerprint text not null check (char_length(request_fingerprint) between 32 and 128),
  created_at timestamptz not null default now()
);

create index products_category_idx on public.products(category_id, is_published, sort_order);
create index products_search_idx on public.products using gin(to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(sku,'') || ' ' || coalesce(description,'')));
create index products_merchandising_idx on public.products(is_published, is_popular, is_best_seller, is_recommended, is_festival_product);
create index product_images_product_idx on public.product_images(product_id, sort_order);
create index banners_active_idx on public.banners(is_active, placement, starts_at, ends_at, sort_order);
create index offers_active_idx on public.offers(is_active, starts_at, ends_at);
create index orders_created_idx on public.orders(created_at desc);
create index orders_mobile_idx on public.orders(mobile);
create index order_items_order_idx on public.order_items(order_id);
create index order_submission_attempts_idx on public.order_submission_attempts(request_fingerprint, created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger admin_profiles_updated before update on public.admin_profiles for each row execute function public.set_updated_at();
create trigger categories_updated before update on public.categories for each row execute function public.set_updated_at();
create trigger products_updated before update on public.products for each row execute function public.set_updated_at();
create trigger product_images_updated before update on public.product_images for each row execute function public.set_updated_at();
create trigger catalog_import_issues_updated before update on public.catalog_import_issues for each row execute function public.set_updated_at();
create trigger banners_updated before update on public.banners for each row execute function public.set_updated_at();
create trigger offers_updated before update on public.offers for each row execute function public.set_updated_at();
create trigger site_content_updated before update on public.site_content for each row execute function public.set_updated_at();
create trigger serviceable_pincodes_updated before update on public.serviceable_pincodes for each row execute function public.set_updated_at();
create trigger orders_updated before update on public.orders for each row execute function public.set_updated_at();

create or replace function public.is_active_admin(check_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.admin_profiles where id = check_user and is_active and role in ('admin','catalog_manager','content_manager'));
$$;
revoke all on function public.is_active_admin(uuid) from public;
grant execute on function public.is_active_admin(uuid) to anon, authenticated;

create or replace function public.check_delivery_pincode(p_pincode text)
returns table(id uuid,pincode text,area_name text,delivery_fee_paise integer,minimum_order_paise integer,is_active boolean)
language sql stable security definer set search_path = '' as $$
  select s.id,s.pincode,s.area_name,s.delivery_fee_paise,s.minimum_order_paise,s.is_active
  from public.serviceable_pincodes s where p_pincode ~ '^[0-9]{6}$' and s.pincode=p_pincode and s.is_active limit 1;
$$;
revoke all on function public.check_delivery_pincode(text) from public;
grant execute on function public.check_delivery_pincode(text) to anon, authenticated;

alter table public.admin_profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.catalog_import_issues enable row level security;
alter table public.banners enable row level security;
alter table public.offers enable row level security;
alter table public.site_content enable row level security;
alter table public.serviceable_pincodes enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_submission_attempts enable row level security;

create policy "admins read own profile" on public.admin_profiles for select to authenticated using (id = auth.uid() or public.is_active_admin());
create or replace function public.is_full_admin(check_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.admin_profiles where id = check_user and is_active and role = 'admin');
$$;
revoke all on function public.is_full_admin(uuid) from public;
grant execute on function public.is_full_admin(uuid) to authenticated;
create policy "full admins manage profiles" on public.admin_profiles for all to authenticated using (public.is_full_admin()) with check (public.is_full_admin());
create policy "public reads active categories" on public.categories for select to anon, authenticated using (is_active or public.is_active_admin());
create policy "admins manage categories" on public.categories for all to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
create policy "public reads published products" on public.products for select to anon, authenticated using (is_published or public.is_active_admin());
create policy "admins manage products" on public.products for all to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
create policy "public reads published product images" on public.product_images for select to anon, authenticated using (exists(select 1 from public.products p where p.id=product_id and p.is_published) or public.is_active_admin());
create policy "admins manage product images" on public.product_images for all to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
create policy "admins manage catalog import issues" on public.catalog_import_issues for all to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
create policy "public reads current banners" on public.banners for select to anon, authenticated using ((is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now())) or public.is_active_admin());
create policy "admins manage banners" on public.banners for all to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
create policy "public reads current offers" on public.offers for select to anon, authenticated using ((is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now())) or public.is_active_admin());
create policy "admins manage offers" on public.offers for all to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
create policy "public reads public content" on public.site_content for select to anon, authenticated using (is_public or public.is_active_admin());
create policy "admins manage content" on public.site_content for all to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
create policy "admins manage pincodes" on public.serviceable_pincodes for all to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
create policy "admins read orders" on public.orders for select to authenticated using (public.is_active_admin());
create policy "admins read order items" on public.order_items for select to authenticated using (public.is_active_admin());

create or replace function public.create_cod_order(
  p_customer jsonb,
  p_items jsonb,
  p_offer_code text,
  p_idempotency_key uuid
) returns table(order_id uuid, order_number text, total_paise integer, payment_method text)
language plpgsql security definer set search_path = '' as $$
declare
  v_existing public.orders%rowtype;
  v_area public.serviceable_pincodes%rowtype;
  v_offer public.offers%rowtype;
  v_item jsonb;
  v_product public.products%rowtype;
  v_order_id uuid;
  v_order_number text;
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
  if found then return query select v_existing.id,v_existing.order_number,v_existing.total_paise,'Cash on Delivery'::text; return; end if;
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
  insert into public.orders(id,order_number,full_name,mobile,alternate_mobile,email,address_line_1,address_line_2,landmark,city,state,pincode,subtotal_paise,discount_paise,delivery_fee_paise,total_paise,payment_method,payment_status,order_status,customer_notes,offer_code,idempotency_key)
  values(v_order_id,v_order_number,trim(p_customer->>'full_name'),p_customer->>'mobile',nullif(trim(p_customer->>'alternate_mobile'),''),nullif(trim(p_customer->>'email'),''),trim(p_customer->>'address_line_1'),nullif(trim(p_customer->>'address_line_2'),''),nullif(trim(p_customer->>'landmark'),''),trim(p_customer->>'city'),trim(p_customer->>'state'),p_customer->>'pincode',v_subtotal::integer,v_discount::integer,v_delivery,v_total::integer,'cash_on_delivery','pending_cod','placed',nullif(trim(p_customer->>'delivery_instructions'),''),nullif(upper(trim(p_offer_code)),''),p_idempotency_key);
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_product_id := (v_item->>'product_id')::uuid; v_quantity := (v_item->>'quantity')::integer;
    select * into strict v_product from public.products where id=v_product_id and is_published and in_stock;
    insert into public.order_items(order_id,product_id,product_name,sku,unit_label,unit_price_paise,quantity,line_total_paise) values(v_order_id,v_product.id,v_product.name,v_product.sku,v_product.unit_label,v_product.price_paise,v_quantity,v_product.price_paise*v_quantity);
  end loop;
  return query select v_order_id,v_order_number,v_total::integer,'Cash on Delivery'::text;
exception when unique_violation then
  select * into v_existing from public.orders where idempotency_key=p_idempotency_key;
  if found then return query select v_existing.id,v_existing.order_number,v_existing.total_paise,'Cash on Delivery'::text; else raise; end if;
end;
$$;
revoke all on function public.create_cod_order(jsonb,jsonb,text,uuid) from public, anon, authenticated;
grant execute on function public.create_cod_order(jsonb,jsonb,text,uuid) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
  ('products','products',true,5242880,array['image/jpeg','image/png','image/webp']),
  ('product-galleries','product-galleries',true,5242880,array['image/jpeg','image/png','image/webp']),
  ('categories','categories',true,5242880,array['image/jpeg','image/png','image/webp']),
  ('banners','banners',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy "public reads storefront images" on storage.objects for select to public using (bucket_id in ('products','product-galleries','categories','banners'));
create policy "admins upload storefront images" on storage.objects for insert to authenticated with check (bucket_id in ('products','product-galleries','categories','banners') and public.is_active_admin());
create policy "admins update storefront images" on storage.objects for update to authenticated using (bucket_id in ('products','product-galleries','categories','banners') and public.is_active_admin()) with check (bucket_id in ('products','product-galleries','categories','banners') and public.is_active_admin());
create policy "admins delete storefront images" on storage.objects for delete to authenticated using (bucket_id in ('products','product-galleries','categories','banners') and public.is_active_admin());

commit;
