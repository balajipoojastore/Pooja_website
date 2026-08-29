begin;

alter table public.orders
  add column if not exists tracking_token_expires_at timestamptz;

update public.orders
set tracking_token_expires_at = greatest(created_at + interval '1 year', now() + interval '30 days')
where tracking_token_expires_at is null;

alter table public.orders
  alter column tracking_token_expires_at set default (now() + interval '1 year'),
  alter column tracking_token_expires_at set not null;

create index if not exists orders_tracking_token_expires_at_idx
  on public.orders(tracking_token_expires_at);

commit;
