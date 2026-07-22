-- Execute este arquivo no Supabase > SQL Editor
create extension if not exists pgcrypto;

alter table public.news
  add column if not exists content text,
  add column if not exists category_id uuid references public.categories(id) on delete set null,
  add column if not exists author_id uuid references public.authors(id) on delete set null,
  add column if not exists status text default 'draft',
  add column if not exists homepage_position text default 'latest',
  add column if not exists is_featured boolean default false,
  add column if not exists is_breaking boolean default false,
  add column if not exists cover_image_url text,
  add column if not exists image_url text,
  add column if not exists meta_description text,
  add column if not exists published_at timestamptz,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.advertisers
  add column if not exists name text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists whatsapp text,
  add column if not exists website text,
  add column if not exists logo_url text,
  add column if not exists is_active boolean default true,
  add column if not exists created_at timestamptz default now();

alter table public.ad_campaigns
  add column if not exists name text,
  add column if not exists position text,
  add column if not exists status text default 'draft',
  add column if not exists desktop_image_url text,
  add column if not exists mobile_image_url text,
  add column if not exists target_url text,
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz,
  add column if not exists created_at timestamptz default now();

alter table public.categories add column if not exists description text, add column if not exists created_at timestamptz default now();
alter table public.authors add column if not exists bio text, add column if not exists avatar_url text, add column if not exists created_at timestamptz default now();

grant usage on schema public to anon, authenticated;
grant select on public.categories, public.authors, public.news, public.ad_campaigns, public.advertisers to anon, authenticated;
grant select, insert, update, delete on public.news, public.categories, public.authors, public.advertisers, public.ad_campaigns to authenticated;

alter table public.news enable row level security;
alter table public.categories enable row level security;
alter table public.authors enable row level security;
alter table public.advertisers enable row level security;
alter table public.ad_campaigns enable row level security;

drop policy if exists public_read_published_news on public.news;
create policy public_read_published_news on public.news for select to anon, authenticated using (status='published' or auth.role()='authenticated');
drop policy if exists authenticated_manage_news on public.news;
create policy authenticated_manage_news on public.news for all to authenticated using (true) with check (true);

drop policy if exists public_read_categories on public.categories;
create policy public_read_categories on public.categories for select to anon, authenticated using (true);
drop policy if exists authenticated_manage_categories on public.categories;
create policy authenticated_manage_categories on public.categories for all to authenticated using (true) with check (true);

drop policy if exists public_read_authors on public.authors;
create policy public_read_authors on public.authors for select to anon, authenticated using (true);
drop policy if exists authenticated_manage_authors on public.authors;
create policy authenticated_manage_authors on public.authors for all to authenticated using (true) with check (true);

drop policy if exists public_read_active_advertisers on public.advertisers;
create policy public_read_active_advertisers on public.advertisers for select to anon, authenticated using (is_active=true or auth.role()='authenticated');
drop policy if exists authenticated_manage_advertisers on public.advertisers;
create policy authenticated_manage_advertisers on public.advertisers for all to authenticated using (true) with check (true);

drop policy if exists public_read_active_campaigns on public.ad_campaigns;
create policy public_read_active_campaigns on public.ad_campaigns for select to anon, authenticated using (status='active' or auth.role()='authenticated');
drop policy if exists authenticated_manage_campaigns on public.ad_campaigns;
create policy authenticated_manage_campaigns on public.ad_campaigns for all to authenticated using (true) with check (true);

drop policy if exists public_read_portal_images on storage.objects;
create policy public_read_portal_images on storage.objects for select to public using (bucket_id='portal-images');
drop policy if exists authenticated_manage_portal_images on storage.objects;
create policy authenticated_manage_portal_images on storage.objects for all to authenticated using (bucket_id='portal-images') with check (bucket_id='portal-images');

select 'Banco atualizado com sucesso' as resultado;