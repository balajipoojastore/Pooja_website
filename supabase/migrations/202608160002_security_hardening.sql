begin;

-- Public storefront reads must not depend on a SECURITY DEFINER admin helper.
-- Keep the helper executable only by signed-in users; anonymous clients receive
-- narrowly scoped policies for active/published rows.
drop policy if exists "public reads active categories" on public.categories;
drop policy if exists "public reads published products" on public.products;
drop policy if exists "public reads published product images" on public.product_images;
drop policy if exists "public reads current banners" on public.banners;
drop policy if exists "public reads current offers" on public.offers;
drop policy if exists "public reads public content" on public.site_content;

create policy "anonymous reads active categories" on public.categories
for select to anon using (is_active);
create policy "authenticated reads categories" on public.categories
for select to authenticated using (is_active or public.is_active_admin());

create policy "anonymous reads published products" on public.products
for select to anon using (is_published);
create policy "authenticated reads products" on public.products
for select to authenticated using (is_published or public.is_active_admin());

create policy "anonymous reads published product images" on public.product_images
for select to anon using (exists (
  select 1 from public.products p where p.id=product_id and p.is_published
));
create policy "authenticated reads product images" on public.product_images
for select to authenticated using (exists (
  select 1 from public.products p where p.id=product_id and p.is_published
) or public.is_active_admin());

create policy "anonymous reads current banners" on public.banners
for select to anon using (is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now()));
create policy "authenticated reads banners" on public.banners
for select to authenticated using ((is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now())) or public.is_active_admin());

create policy "anonymous reads current offers" on public.offers
for select to anon using (is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now()));
create policy "authenticated reads offers" on public.offers
for select to authenticated using ((is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now())) or public.is_active_admin());

create policy "anonymous reads public content" on public.site_content
for select to anon using (is_public);
create policy "authenticated reads content" on public.site_content
for select to authenticated using (is_public or public.is_active_admin());

revoke execute on function public.is_active_admin(uuid) from anon;
revoke execute on function public.is_full_admin(uuid) from anon;

drop policy if exists "admins read own profile" on public.admin_profiles;
create policy "admins read own profile" on public.admin_profiles
for select to authenticated using (id = (select auth.uid()) or public.is_active_admin());

-- This table is service-role infrastructure. An explicit deny documents that
-- browser roles may never inspect or mutate abuse-control records.
create policy "browser roles cannot access order attempts" on public.order_submission_attempts
for all to anon, authenticated using (false) with check (false);

create index if not exists catalog_import_issues_product_idx on public.catalog_import_issues(product_id);
create index if not exists order_items_product_idx on public.order_items(product_id);
create index if not exists order_status_history_changed_by_idx on public.order_status_history(changed_by);

commit;
