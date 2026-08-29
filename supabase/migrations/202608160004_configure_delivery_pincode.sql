begin;

insert into public.serviceable_pincodes (
  pincode,
  area_name,
  delivery_fee_paise,
  minimum_order_paise,
  is_active
) values (
  '560087',
  'Delivery Area 560087',
  4000,
  19900,
  true
)
on conflict (pincode) do update
set is_active = true,
    updated_at = now();

-- These rows are explicitly identified as temporary development examples in
-- the original seed. Keep them for history, but make 560087 the active area.
update public.serviceable_pincodes
set is_active = false,
    updated_at = now()
where (pincode = '560001' and area_name = 'Bengaluru GPO')
   or (pincode = '560004' and area_name = 'Basavanagudi');

commit;
