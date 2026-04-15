-- ==============================================================================
-- 🏛️ MODULE CCC : SYNCHRONISATION FOURNISSEURS OFFICIELS
-- Date : 23 Janvier 2026
-- Objectif : Synchroniser la table referentiel_fournisseurs avec l'API CCC
-- ==============================================================================

-- 1. Vérifier que la table referentiel_fournisseurs existe
-- (Elle devrait déjà exister, cette section est pour documentation)
-- CREATE TABLE IF NOT EXISTS public.referentiel_fournisseurs (
--   fournisseur_id text NOT NULL PRIMARY KEY,
--   nom_court text NOT NULL,
--   denomination_complete text NULL,
--   type_fournisseur text NULL CHECK (type_fournisseur IN ('COOPERATIVE', 'ACHETEUR')),
--   statut_systeme text NULL DEFAULT 'en_attente'
-- );

-- 2. Ajouter colonne de tracking de synchronisation
ALTER TABLE public.referentiel_fournisseurs
ADD COLUMN IF NOT EXISTS last_sync_date timestamp with time zone DEFAULT now();

-- 3. Table de logs de synchronisation
CREATE TABLE IF NOT EXISTS public.ccc_sync_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_date timestamp with time zone DEFAULT now(),
    status text CHECK (status IN ('SUCCESS', 'PARTIAL', 'FAILED')),
    total_records integer,
    new_records integer,
    updated_records integer,
    error_message text,
    execution_time_ms integer
);

-- 4. Fonction RPC pour vérifier l'agrément CCC
CREATE OR REPLACE FUNCTION public.verify_ccc_approval(
  p_nom text,
  p_type text DEFAULT NULL -- 'ACHETEUR' ou 'COOPERATIVE'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result record;
BEGIN
  SELECT 
    fournisseur_id,
    nom_court,
    denomination_complete,
    type_fournisseur,
    statut_systeme,
    last_sync_date
  INTO v_result
  FROM public.referentiel_fournisseurs
  WHERE 
    LOWER(nom_court) ILIKE '%' || LOWER(p_nom) || '%'
    AND (p_type IS NULL OR type_fournisseur = p_type)
  ORDER BY last_sync_date DESC NULLS LAST
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'approved', true,
      'fournisseur_id', v_result.fournisseur_id,
      'nom_court', v_result.nom_court,
      'type', v_result.type_fournisseur,
      'denomination', v_result.denomination_complete,
      'statut', v_result.statut_systeme,
      'last_sync', v_result.last_sync_date
    );
  ELSE
    RETURN jsonb_build_object('approved', false);
  END IF;
END;
$$;

-- 5. Fonction RPC pour obtenir les statistiques de synchronisation
CREATE OR REPLACE FUNCTION public.get_ccc_sync_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_last_sync record;
  v_total_fournisseurs integer;
  v_total_acheteurs integer;
  v_total_cooperatives integer;
BEGIN
  -- Dernière synchronisation
  SELECT * INTO v_last_sync
  FROM public.ccc_sync_logs
  ORDER BY sync_date DESC
  LIMIT 1;

  -- Statistiques fournisseurs depuis referentiel_fournisseurs
  SELECT COUNT(*) INTO v_total_fournisseurs
  FROM public.referentiel_fournisseurs;

  SELECT COUNT(*) INTO v_total_acheteurs
  FROM public.referentiel_fournisseurs
  WHERE type_fournisseur = 'ACHETEUR';

  SELECT COUNT(*) INTO v_total_cooperatives
  FROM public.referentiel_fournisseurs
  WHERE type_fournisseur = 'COOPERATIVE';

  RETURN jsonb_build_object(
    'last_sync', jsonb_build_object(
      'date', v_last_sync.sync_date,
      'status', v_last_sync.status,
      'total_records', v_last_sync.total_records,
      'new_records', v_last_sync.new_records,
      'updated_records', v_last_sync.updated_records,
      'execution_time_ms', v_last_sync.execution_time_ms
    ),
    'statistics', jsonb_build_object(
      'total_fournisseurs', v_total_fournisseurs,
      'acheteurs', v_total_acheteurs,
      'cooperatives', v_total_cooperatives
    )
  );
END;
$$;

-- 6. RLS pour les logs de synchronisation
ALTER TABLE public.ccc_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read sync logs for authenticated users"
ON public.ccc_sync_logs FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow insert sync logs for authenticated users"
ON public.ccc_sync_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- 7. Commentaires pour documentation
COMMENT ON TABLE public.referentiel_fournisseurs IS 'Référentiel officiel des fournisseurs agréés par le Conseil Café-Cacao';
COMMENT ON COLUMN public.referentiel_fournisseurs.fournisseur_id IS 'Identifiant unique du fournisseur dans le système CCC (ex: A00000307, C00001234)';
COMMENT ON COLUMN public.referentiel_fournisseurs.nom_court IS 'Nom court ou raison sociale du fournisseur';
COMMENT ON COLUMN public.referentiel_fournisseurs.denomination_complete IS 'Dénomination complète selon le registre CCC';
COMMENT ON COLUMN public.referentiel_fournisseurs.type_fournisseur IS 'Type de fournisseur selon CCC: ACHETEUR (exportateur) ou COOPERATIVE';
COMMENT ON COLUMN public.referentiel_fournisseurs.statut_systeme IS 'Statut dans le système Origin.e-One (en_attente, actif, inactif)';
COMMENT ON COLUMN public.referentiel_fournisseurs.last_sync_date IS 'Date de dernière synchronisation avec l''API CCC';

COMMENT ON TABLE public.ccc_sync_logs IS 'Historique des synchronisations avec l''API du Conseil Café-Cacao';
