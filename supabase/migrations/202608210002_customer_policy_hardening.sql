begin;
-- Tracking history is exposed only through the token-protected sanitizing Edge Function.
-- Customers do not need direct access to changed_by, notes, or internal change sources.
drop policy if exists "customers read own order history" on public.order_status_history;
commit;
