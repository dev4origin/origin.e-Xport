-- ==============================================================================
-- 🛠️ FIX RLS FOR PROFILE & CCC CREDENTIALS
-- Date : 13 Mars 2026
-- Objectif : Débloquer la lecture du profil et la sauvegarde des accès CCC
-- ==============================================================================

-- 1. Table: user_profile
-- Permettre aux utilisateurs authentifiés de lire tous les profils (nécessaire pour le staff)
-- et de modifier le leur.
ALTER TABLE IF EXISTS public.user_profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.user_profile;
CREATE POLICY "Public profiles are viewable by everyone" ON public.user_profile
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profile;
CREATE POLICY "Users can update own profile" ON public.user_profile
    FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 2. Table: fournisseurs (Organisation)
-- Permettre la lecture par tous les authentifiés (déjà fait, mais on assure)
-- Permettre la mise à jour par les membres du staff (ou au moins les administrateurs)
ALTER TABLE IF EXISTS public.fournisseurs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for authenticated users to search suppliers" ON public.fournisseurs;
CREATE POLICY "Enable all read for authenticated" ON public.fournisseurs
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable update for staff members" ON public.fournisseurs;
CREATE POLICY "Enable update for staff members" ON public.fournisseurs
    FOR UPDATE TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.fournisseur_staff 
            WHERE user_id = auth.uid() 
            AND fournisseur_id = public.fournisseurs.id
        )
        OR 
        user_profile_id = auth.uid()
    );

-- 3. Table: fournisseur_staff
ALTER TABLE IF EXISTS public.fournisseur_staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff are viewable by authenticated users" ON public.fournisseur_staff;
CREATE POLICY "Staff are viewable by authenticated users" ON public.fournisseur_staff
    FOR SELECT TO authenticated USING (true);

-- 4. Table: ccc_sync_logs (Déjà fait dans une autre migration mais on assure la cohérence)
ALTER TABLE IF EXISTS public.ccc_sync_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read sync logs for authenticated users" ON public.ccc_sync_logs;
CREATE POLICY "Allow read sync logs for authenticated users" ON public.ccc_sync_logs
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert sync logs for authenticated users" ON public.ccc_sync_logs;
CREATE POLICY "Allow insert sync logs for authenticated users" ON public.ccc_sync_logs
    FOR INSERT TO authenticated WITH CHECK (true);
