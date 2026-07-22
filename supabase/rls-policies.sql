-- Execute este arquivo inteiro no Supabase > SQL Editor > New query > Run

-- Permissões básicas do schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT USAGE ON SCHEMA storage TO anon, authenticated;

-- Permissões das tabelas
GRANT SELECT ON TABLE public.categories TO anon, authenticated;
GRANT SELECT ON TABLE public.authors TO anon, authenticated;
GRANT SELECT ON TABLE public.news TO anon, authenticated;

GRANT ALL PRIVILEGES ON TABLE public.categories TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.authors TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.news TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.advertisers TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.ad_campaigns TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.news_images TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.news_videos TO authenticated;
GRANT SELECT, INSERT ON TABLE public.news_views TO anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.ad_clicks TO anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.ad_impressions TO anon, authenticated;

-- Sequências usadas por colunas identity/serial
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- RLS DAS TABELAS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertisers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_manage_categories" ON public.categories;
CREATE POLICY "authenticated_manage_categories" ON public.categories
FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_read_categories" ON public.categories;
CREATE POLICY "public_read_categories" ON public.categories
FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_manage_authors" ON public.authors;
CREATE POLICY "authenticated_manage_authors" ON public.authors
FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_read_authors" ON public.authors;
CREATE POLICY "public_read_authors" ON public.authors
FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_manage_news" ON public.news;
CREATE POLICY "authenticated_manage_news" ON public.news
FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_read_published_news" ON public.news;
CREATE POLICY "public_read_published_news" ON public.news
FOR SELECT TO anon, authenticated
USING (status = 'published' OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "authenticated_manage_advertisers" ON public.advertisers;
CREATE POLICY "authenticated_manage_advertisers" ON public.advertisers
FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_manage_campaigns" ON public.ad_campaigns;
CREATE POLICY "authenticated_manage_campaigns" ON public.ad_campaigns
FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_manage_news_images" ON public.news_images;
CREATE POLICY "authenticated_manage_news_images" ON public.news_images
FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_manage_news_videos" ON public.news_videos;
CREATE POLICY "authenticated_manage_news_videos" ON public.news_videos
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- STORAGE
DROP POLICY IF EXISTS "public_read_portal_images" ON storage.objects;
CREATE POLICY "public_read_portal_images" ON storage.objects
FOR SELECT TO anon, authenticated USING (bucket_id = 'portal-images');

DROP POLICY IF EXISTS "authenticated_upload_portal_images" ON storage.objects;
CREATE POLICY "authenticated_upload_portal_images" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'portal-images');

DROP POLICY IF EXISTS "authenticated_update_portal_images" ON storage.objects;
CREATE POLICY "authenticated_update_portal_images" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'portal-images')
WITH CHECK (bucket_id = 'portal-images');

DROP POLICY IF EXISTS "authenticated_delete_portal_images" ON storage.objects;
CREATE POLICY "authenticated_delete_portal_images" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'portal-images');