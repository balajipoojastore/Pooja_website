begin;

insert into public.categories (name, slug, description, sort_order, is_active)
values
  ('Kumkum Haldi Chandan', 'kumkum-haldi-chandan', 'Kumkum, turmeric, chandan and sacred powders for daily rituals.', 50, true),
  ('Oils & Ghee', 'oils-ghee', 'Lamp oils, pooja ghee and related ritual essentials.', 60, true)
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    sort_order = excluded.sort_order,
    is_active = true,
    updated_at = now();

commit;
