-- Execute este arquivo no Supabase > SQL Editor > New query > Run

-- TABELAS PÚBLICAS DE LEITURA
alter table public.categories enable row level security;
alter table public.authors enable row level security;
alter table public.news enable row level security;

-- Painel: usuário autenticado pode gerenciar categorias
 drop policy if exists "authenticated_manage_categories" on public.categories;
create policy "authenticated_manage_categories"
on public.categories for all
to authenticated
using (true)
with check (true);

-- Portal: qualquer visitante pode ler categorias
 drop policy if exists "public_read_categories" on public.categories;
create policy "public_read_categories"
on public.categories for select
to anon, authenticated
using (true);

-- Painel: usuário autenticado pode gerenciar autores
 drop policy if exists "authenticated_manage_authors" on public.authors;
create policy "authenticated_manage_authors"
on public.authors for all
to authenticated
using (true)
with check (true);

-- Portal: qualquer visitante pode ler autores
 drop policy if exists "public_read_authors" on public.authors;
create policy "public_read_authors"
on public.authors for select
to anon, authenticated
using (true);

-- Painel: usuário autenticado pode criar, editar e excluir notícias
 drop policy if exists "authenticated_manage_news" on public.news;
create policy "authenticated_manage_news"
on public.news for all
to authenticated
using (true)
with check (true);

-- Portal: visitantes veem apenas notícias publicadas
 drop policy if exists "public_read_published_news" on public.news;
create policy "public_read_published_news"
on public.news for select
to anon, authenticated
using (status = 'published');

-- OUTRAS TABELAS DO PAINEL
alter table public.advertisers enable row level security;
alter table public.ad_campaigns enable row level security;
alter table public.news_images enable row level security;
alter table public.news_videos enable row level security;

 drop policy if exists "authenticated_manage_advertisers" on public.advertisers;
create policy "authenticated_manage_advertisers" on public.advertisers for all to authenticated using (true) with check (true);

 drop policy if exists "authenticated_manage_campaigns" on public.ad_campaigns;
create policy "authenticated_manage_campaigns" on public.ad_campaigns for all to authenticated using (true) with check (true);

 drop policy if exists "authenticated_manage_news_images" on public.news_images;
create policy "authenticated_manage_news_images" on public.news_images for all to authenticated using (true) with check (true);

 drop policy if exists "authenticated_manage_news_videos" on public.news_videos;
create policy "authenticated_manage_news_videos" on public.news_videos for all to authenticated using (true) with check (true);

-- STORAGE: bucket portal-images
 drop policy if exists "public_read_portal_images" on storage.objects;
create policy "public_read_portal_images"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'portal-images');

 drop policy if exists "authenticated_upload_portal_images" on storage.objects;
create policy "authenticated_upload_portal_images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'portal-images');

 drop policy if exists "authenticated_update_portal_images" on storage.objects;
create policy "authenticated_update_portal_images"
on storage.objects for update
to authenticated
using (bucket_id = 'portal-images')
with check (bucket_id = 'portal-images');

 drop policy if exists "authenticated_delete_portal_images" on storage.objects;
create policy "authenticated_delete_portal_images"
on storage.objects for delete
to authenticated
using (bucket_id = 'portal-images');