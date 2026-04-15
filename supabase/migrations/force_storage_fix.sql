-- ==============================================================================
-- 🛠️ FORCE STORAGE RLS FIX
-- Objectif : Réparer "StorageException: new row violates row-level security policy"
-- ==============================================================================

-- 1. S'assurer que les buckets existent et sont PUBLICS
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('producteurs', 'producteurs', true),
  ('pieces', 'pieces', true),
  ('cultures', 'cultures', true),
  ('membres-menage', 'membres-menage', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Nettoyer TOUTES les anciennes policies pour éviter les conflits
-- (On ignore les erreurs si elles n'existent pas)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Agents upload all producers" ON storage.objects;
    DROP POLICY IF EXISTS "Agents upload all pieces" ON storage.objects;
    DROP POLICY IF EXISTS "Agents upload all cultures" ON storage.objects;
    DROP POLICY IF EXISTS "Agents upload all members" ON storage.objects;
    DROP POLICY IF EXISTS "Agents update all files" ON storage.objects;
    DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON storage.objects;
    DROP POLICY IF EXISTS "Give me access please" ON storage.objects;
    -- Ajoutez ici d'autres noms si vous en avez créés
END $$;

-- 3. Créer UNE SEULE policy permissive pour l'upload (INSERT)
-- Autorise tout utilisateur connecté à uploader dans ces 4 buckets
CREATE POLICY "Allow Authenticated INSERT All Buckets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK ( 
  bucket_id IN ('producteurs', 'pieces', 'cultures', 'membres-menage') 
);

-- 4. Créer UNE SEULE policy permissive pour la modification (UPDATE)
CREATE POLICY "Allow Authenticated UPDATE All Buckets"
ON storage.objects FOR UPDATE TO authenticated
USING ( 
  bucket_id IN ('producteurs', 'pieces', 'cultures', 'membres-menage') 
);

-- 5. Créer UNE SEULE policy permissive pour la lecture (SELECT)
CREATE POLICY "Allow Authenticated SELECT All Buckets"
ON storage.objects FOR SELECT TO authenticated
USING ( 
  bucket_id IN ('producteurs', 'pieces', 'cultures', 'membres-menage') 
);

-- 6. (Optionnel) DELETE
CREATE POLICY "Allow Authenticated DELETE All Buckets"
ON storage.objects FOR DELETE TO authenticated
USING ( 
  bucket_id IN ('producteurs', 'pieces', 'cultures', 'membres-menage') 
);
