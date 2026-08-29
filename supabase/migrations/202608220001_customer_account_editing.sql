begin;

create or replace function public.update_customer_profile(
  p_full_name text,
  p_phone text
) returns jsonb
language plpgsql
security definer
set search_path = '' as $$
declare
  v_customer_id uuid := auth.uid();
  v_profile public.customer_profiles%rowtype;
begin
  if v_customer_id is null or auth.role() <> 'authenticated' then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_full_name, ''))) not between 2 and 100 then
    raise exception 'invalid full name';
  end if;
  if coalesce(p_phone, '') !~ '^[6-9][0-9]{9}$' then
    raise exception 'invalid mobile number';
  end if;

  update public.customer_profiles
  set full_name = trim(p_full_name), phone = p_phone
  where id = v_customer_id
  returning * into v_profile;

  if not found then raise exception 'customer profile not found'; end if;
  return jsonb_build_object('profile_id', v_profile.id, 'updated_at', v_profile.updated_at);
end;
$$;

revoke all on function public.update_customer_profile(text,text) from public, anon;
grant execute on function public.update_customer_profile(text,text) to authenticated;

create or replace function public.update_customer_address(
  p_address_id uuid,
  p_address jsonb
) returns jsonb
language plpgsql
security definer
set search_path = '' as $$
declare
  v_customer_id uuid := auth.uid();
  v_address public.customer_addresses%rowtype;
  v_label text := trim(coalesce(p_address->>'label', ''));
  v_address_line_1 text := trim(coalesce(p_address->>'address_line_1', ''));
  v_address_line_2 text := nullif(trim(p_address->>'address_line_2'), '');
  v_landmark text := nullif(trim(p_address->>'landmark'), '');
  v_city text := trim(coalesce(p_address->>'city', ''));
  v_state text := trim(coalesce(p_address->>'state', ''));
  v_pincode text := coalesce(p_address->>'pincode', '');
  v_location_url text := nullif(trim(p_address->>'location_url'), '');
begin
  if v_customer_id is null or auth.role() <> 'authenticated' then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if p_address_id is null then raise exception 'address is required'; end if;
  if char_length(v_label) not between 1 and 30 then raise exception 'invalid address label'; end if;
  if char_length(v_address_line_1) not between 5 and 200
    or char_length(v_city) not between 2 and 80
    or char_length(v_state) not between 2 and 80 then
    raise exception 'invalid address';
  end if;
  if char_length(coalesce(v_address_line_2, '')) > 200
    or char_length(coalesce(v_landmark, '')) > 120 then
    raise exception 'invalid address';
  end if;
  if v_pincode !~ '^[0-9]{6}$' then raise exception 'invalid pincode'; end if;
  if not public.is_valid_google_maps_location_url(v_location_url) then
    raise exception 'invalid map location';
  end if;
  if not exists (
    select 1 from public.serviceable_pincodes
    where pincode = v_pincode and is_active
  ) then
    raise exception 'unserviceable pincode';
  end if;

  update public.customer_addresses
  set label = v_label,
      address_line_1 = v_address_line_1,
      address_line_2 = v_address_line_2,
      landmark = v_landmark,
      city = v_city,
      state = v_state,
      pincode = v_pincode,
      location_url = v_location_url
  where id = p_address_id and customer_id = v_customer_id
  returning * into v_address;

  if not found then raise exception 'address not found' using errcode = '42501'; end if;
  return jsonb_build_object('address_id', v_address.id, 'updated_at', v_address.updated_at);
end;
$$;

revoke all on function public.update_customer_address(uuid,jsonb) from public, anon;
grant execute on function public.update_customer_address(uuid,jsonb) to authenticated;

commit;
