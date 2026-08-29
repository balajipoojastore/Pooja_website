begin;

-- pgcrypto is installed in Supabase's `extensions` schema. The order RPC
-- intentionally uses an empty search_path, so extension functions must be
-- schema-qualified or checkout fails before the transaction can insert rows.
create or replace function public.create_cod_order(
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
  v_tracking_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_tracking_hash := encode(extensions.digest(v_tracking_token, 'sha256'), 'hex');
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

commit;
