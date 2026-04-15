-- ==============================================================================
-- 🛠️ FIX RLS & STORAGE POLICIES
-- Date : 28 Janvier 2026
-- Objectif : Débloquer la synchronisation (INSERT/UPDATE) et les uploads (Storage)
-- ==============================================================================

-- 1. TABLE RLS FIXES
-- On applique des politiques permissives pour les utilisateurs authentifiés pour débloquer la prod.

-- Helper macro-like actions (manual per table for safety)

-- 1.1 Producteurs
ALTER TABLE IF EXISTS public.producteurs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.producteurs;
CREATE POLICY "Enable all access for authenticated users" ON public.producteurs
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 1.2 Parcelles
ALTER TABLE IF EXISTS public.parcelles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.parcelles;
CREATE POLICY "Enable all access for authenticated users" ON public.parcelles
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 1.3 Polygones
ALTER TABLE IF EXISTS public.polygones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.polygones;
CREATE POLICY "Enable all access for authenticated users" ON public.polygones
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 1.4 Cultures
ALTER TABLE IF EXISTS public.cultures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.cultures;
CREATE POLICY "Enable all access for authenticated users" ON public.cultures
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 1.5 Membres Ménage
ALTER TABLE IF EXISTS public.membres_menage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.membres_menage;
CREATE POLICY "Enable all access for authenticated users" ON public.membres_menage
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 1.6 Liaisons Producteurs-Fournisseurs
ALTER TABLE IF EXISTS public.liaisons_producteurs_fournisseurs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.liaisons_producteurs_fournisseurs;
CREATE POLICY "Enable all access for authenticated users" ON public.liaisons_producteurs_fournisseurs
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 1.7 Livraisons (Souvent impliqué)
ALTER TABLE IF EXISTS public.livraisons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.livraisons;
CREATE POLICY "Enable all access for authenticated users" ON public.livraisons
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);


-- 2. STORAGE BUCKETS SETUP & POLICIES
-- On s'assure que les buckets existent et on leur donne les droits

insert into storage.buckets (id, name, public)
values 
  ('producteurs', 'producteurs', true),
  ('pieces', 'pieces', true),
  ('cultures', 'cultures', true),
  ('membres-menage', 'membres-menage', true)
on conflict (id) do nothing;

-- 2.1 Storage Policies Generic Function
-- On crée des policies explicites pour chaque bucket pour éviter les interactions bizarres

-- Bucket: producteurs
DROP POLICY IF EXISTS "Allow authenticated uploads to producteurs" ON storage.objects;
CREATE POLICY "Allow authenticated uploads to producteurs" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'producteurs');

DROP POLICY IF EXISTS "Allow authenticated select to producteurs" ON storage.objects;
CREATE POLICY "Allow authenticated select to producteurs" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'producteurs');

DROP POLICY IF EXISTS "Allow authenticated update to producteurs" ON storage.objects;
CREATE POLICY "Allow authenticated update to producteurs" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'producteurs');


-- Bucket: pieces
DROP POLICY IF EXISTS "Allow authenticated uploads to pieces" ON storage.objects;
CREATE POLICY "Allow authenticated uploads to pieces" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'pieces');

DROP POLICY IF EXISTS "Allow authenticated select to pieces" ON storage.objects;
CREATE POLICY "Allow authenticated select to pieces" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'pieces');

DROP POLICY IF EXISTS "Allow authenticated update to pieces" ON storage.objects;
CREATE POLICY "Allow authenticated update to pieces" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'pieces');


-- Bucket: cultures
DROP POLICY IF EXISTS "Allow authenticated uploads to cultures" ON storage.objects;
CREATE POLICY "Allow authenticated uploads to cultures" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'cultures');

DROP POLICY IF EXISTS "Allow authenticated select to cultures" ON storage.objects;
CREATE POLICY "Allow authenticated select to cultures" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'cultures');

DROP POLICY IF EXISTS "Allow authenticated update to cultures" ON storage.objects;
CREATE POLICY "Allow authenticated update to cultures" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'cultures');


-- Bucket: membres-menage
DROP POLICY IF EXISTS "Allow authenticated uploads to membres-menage" ON storage.objects;
CREATE POLICY "Allow authenticated uploads to membres-menage" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'membres-menage');

DROP POLICY IF EXISTS "Allow authenticated select to membres-menage" ON storage.objects;
CREATE POLICY "Allow authenticated select to membres-menage" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'membres-menage');

DROP POLICY IF EXISTS "Allow authenticated update to membres-menage" ON storage.objects;
CREATE POLICY "Allow authenticated update to membres-menage" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'membres-menage');
