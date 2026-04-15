-- ==============================================================================
-- 🤝 MODULE PARTENAIRES & CONTRATS
-- ==============================================================================

-- 1. Enrichment de la table `partner_relationships` avec les infos contrats
ALTER TABLE public.partner_relationships
ADD COLUMN IF NOT EXISTS contract_ref text,
ADD COLUMN IF NOT EXISTS contract_url text, -- Lien vers le PDF (Storage)
ADD COLUMN IF NOT EXISTS contract_start_date date,
ADD COLUMN IF NOT EXISTS contract_end_date date;

-- 2. Fonction RPC pour rechercher des partenaires potentiels
-- Cette fonction permet de chercher des fournisseurs (Coopératives) qui ne sont pas moi-même
CREATE OR REPLACE FUNCTION public.search_partners(
  search_term text, 
  current_org_id uuid
)
RETURNS TABLE (
  id uuid,
  nom text,
  region text,
  type text,
  is_already_partner boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    f.nom,
    f.region,
    f.type,
    EXISTS (
        SELECT 1 FROM public.partner_relationships pr 
        WHERE pr.requester_id = current_org_id 
        AND pr.target_id = f.id
        AND pr.status IN ('ACTIVE', 'PENDING')
    ) as is_already_partner
  FROM public.fournisseurs f
  WHERE 
    f.id != current_org_id -- Pas moi-même
    AND (f.nom ILIKE '%' || search_term || '%' OR f.region ILIKE '%' || search_term || '%')
    AND f.type = 'cooperative' -- On cherche principalement des coopératives
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Politique RLS pour lecture publique des fournisseurs (pour la recherche)
-- Note: Les fournisseurs doivent être "découvrables" pour être ajoutés comme partenaires
CREATE POLICY "Enable read access for authenticated users to search suppliers"
ON public.fournisseurs FOR SELECT
TO authenticated
USING (true);
