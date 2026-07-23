-- Portal Serra Atual: libera somente leitura pública das campanhas e imagens.
-- Execute uma vez no Supabase > SQL Editor.

alter table public.ad_campaigns enable row level security;

drop policy if exists "Public can read active campaigns" on public.ad_campaigns;
create policy "Public can read active campaigns"
on public.ad_campaigns
for select
to anon, authenticated
using (
  lower(coalesce(status, '')) = 'active'
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at >= now())
);

-- Usuários autenticados continuam podendo administrar campanhas.
drop policy if exists "Authenticated can manage campaigns" on public.ad_campaigns;
create policy "Authenticated can manage campaigns"
on public.ad_campaigns
for all
to authenticated
using (true)
with check (true);

-- Garante leitura pública dos arquivos do bucket usado pelo portal.
-- A política só concede SELECT; upload e exclusão continuam restritos.
drop policy if exists "Public can read portal images" on storage.objects;
create policy "Public can read portal images"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'portal-images');

-- Administração autenticada do bucket.
drop policy if exists "Authenticated can manage portal images" on storage.objects;
create policy "Authenticated can manage portal images"
on storage.objects
for all
to authenticated
using (bucket_id = 'portal-images')
with check (bucket_id = 'portal-images');
