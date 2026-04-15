-- ==============================================================================
-- 🛠️ FIX TRACE_BATCHES : COLONNES MANQUANTES & RLS
-- Date : 14 Mars 2026
-- Objectif : Ajouter les colonnes requises par cccAutoFetchService et débloquer
--            l'insertion via RLS pour les utilisateurs authentifiés
-- ==============================================================================

-- 1. Ajout des colonnes manquantes (utilisées par cccAutoFetchService.insertRecords)
ALTER TABLE public.trace_batches
ADD COLUMN IF NOT EXISTS reference text,
ADD COLUMN IF NOT EXISTS owner_id uuid,
ADD COLUMN IF NOT EXISTS produit_type text DEFAULT 'CACAO',
ADD COLUMN IF NOT EXISTS etat_physique text DEFAULT 'BRUT',
ADD COLUMN IF NOT EXISTS poids_initial_kg numeric,
ADD COLUMN IF NOT EXISTS quality_grade text,
ADD COLUMN IF NOT EXISTS campagne text;

-- 2. Index sur reference + owner_id pour la déduplication rapide
CREATE INDEX IF NOT EXISTS idx_trace_batches_owner_ref 
ON public.trace_batches(owner_id, reference);

-- 3. Activer RLS (idempotent)
ALTER TABLE public.trace_batches ENABLE ROW LEVEL SECURITY;

-- 4. Policy : accès complet pour les utilisateurs authentifiés
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.trace_batches;
CREATE POLICY "Enable all access for authenticated users" ON public.trace_batches
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
