-- Confirmation invoices are downloaded securely from the website. Status changes
-- no longer enqueue an external WhatsApp delivery, while historical outbox rows
-- remain intact for audit purposes.
create or replace function public.transition_order_status(
  p_order_id uuid,
  p_to_status public.order_status,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_order public.orders%rowtype;
begin
  if not public.is_active_admin(auth.uid()) then
    raise exception 'administrator access required' using errcode='42501';
  end if;
  if p_note is not null and char_length(trim(p_note)) > 500 then
    raise exception 'status note is too long';
  end if;

  select * into v_order from public.orders where id=p_order_id for update;
  if not found then raise exception 'order not found'; end if;
  if not (
    (v_order.status='placed' and p_to_status in ('confirmed','cancelled')) or
    (v_order.status='confirmed' and p_to_status in ('out_for_delivery','cancelled')) or
    (v_order.status='out_for_delivery' and p_to_status in ('delivered','cancelled'))
  ) then
    raise exception 'invalid order status transition from % to %', v_order.status, p_to_status using errcode='22023';
  end if;

  update public.orders set
    status=p_to_status,
    confirmed_at=case when p_to_status='confirmed' then now() else confirmed_at end,
    out_for_delivery_at=case when p_to_status='out_for_delivery' then now() else out_for_delivery_at end,
    delivered_at=case when p_to_status='delivered' then now() else delivered_at end,
    cancelled_at=case when p_to_status='cancelled' then now() else cancelled_at end,
    payment_status=case
      when p_to_status='delivered' then 'collected'::public.payment_status
      when p_to_status='cancelled' then 'cancelled'::public.payment_status
      else payment_status
    end
  where id=p_order_id;

  insert into public.order_status_history(order_id,from_status,to_status,changed_by,change_source,note)
  values(p_order_id,v_order.status,p_to_status,auth.uid(),'admin',nullif(trim(p_note),''));

  return jsonb_build_object(
    'order_id', p_order_id,
    'from_status', v_order.status,
    'to_status', p_to_status,
    'invoice_delivery_id', null,
    'updated_at', now()
  );
end;
$$;

revoke all on function public.transition_order_status(uuid,public.order_status,text) from public, anon;
grant execute on function public.transition_order_status(uuid,public.order_status,text) to authenticated;

comment on function public.transition_order_status(uuid,public.order_status,text) is
  'Performs a locked administrator status transition and audit insert. Invoices are downloaded on demand; no external delivery is queued.';
