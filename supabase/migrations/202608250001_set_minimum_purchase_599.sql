begin;

-- Store money as integer paise. Keep this scoped to the active release PIN so
-- historical/demo delivery areas retain their existing configuration.
update public.serviceable_pincodes
set minimum_order_paise = 59900,
    updated_at = now()
where pincode = '560087'
  and minimum_order_paise is distinct from 59900;

commit;
