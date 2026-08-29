begin;

-- Do not let callers probe another UUID through the RLS helpers. The retained
-- argument preserves existing policy/function signatures but authorization is
-- always evaluated for the JWT subject.
create or replace function public.is_active_admin(check_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.admin_profiles where id=(select auth.uid()) and is_active and role in ('admin','catalog_manager','content_manager'))
$$;
create or replace function public.is_full_admin(check_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.admin_profiles where id=(select auth.uid()) and is_active and role='admin')
$$;
revoke all on function public.is_active_admin(uuid) from public, anon;
revoke all on function public.is_full_admin(uuid) from public, anon;
grant execute on function public.is_active_admin(uuid) to authenticated;
grant execute on function public.is_full_admin(uuid) to authenticated;

-- The authenticated read policies already include active administrators.
-- Split write policies by operation to avoid evaluating two permissive SELECT
-- policies on every CMS query.
drop policy if exists "full admins manage profiles" on public.admin_profiles;
create policy "full admins insert profiles" on public.admin_profiles for insert to authenticated with check (public.is_full_admin());
create policy "full admins update profiles" on public.admin_profiles for update to authenticated using (public.is_full_admin()) with check (public.is_full_admin());
create policy "full admins delete profiles" on public.admin_profiles for delete to authenticated using (public.is_full_admin());

drop policy if exists "admins manage categories" on public.categories;
create policy "admins insert categories" on public.categories for insert to authenticated with check (public.is_active_admin());
create policy "admins update categories" on public.categories for update to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
create policy "admins delete categories" on public.categories for delete to authenticated using (public.is_active_admin());

drop policy if exists "admins manage products" on public.products;
create policy "admins insert products" on public.products for insert to authenticated with check (public.is_active_admin());
create policy "admins update products" on public.products for update to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
create policy "admins delete products" on public.products for delete to authenticated using (public.is_active_admin());

drop policy if exists "admins manage product images" on public.product_images;
create policy "admins insert product images" on public.product_images for insert to authenticated with check (public.is_active_admin());
create policy "admins update product images" on public.product_images for update to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
create policy "admins delete product images" on public.product_images for delete to authenticated using (public.is_active_admin());

drop policy if exists "admins manage banners" on public.banners;
create policy "admins insert banners" on public.banners for insert to authenticated with check (public.is_active_admin());
create policy "admins update banners" on public.banners for update to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
create policy "admins delete banners" on public.banners for delete to authenticated using (public.is_active_admin());

drop policy if exists "admins manage offers" on public.offers;
create policy "admins insert offers" on public.offers for insert to authenticated with check (public.is_active_admin());
create policy "admins update offers" on public.offers for update to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
create policy "admins delete offers" on public.offers for delete to authenticated using (public.is_active_admin());

drop policy if exists "admins manage content" on public.site_content;
create policy "admins insert content" on public.site_content for insert to authenticated with check (public.is_active_admin());
create policy "admins update content" on public.site_content for update to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
create policy "admins delete content" on public.site_content for delete to authenticated using (public.is_active_admin());

commit;
