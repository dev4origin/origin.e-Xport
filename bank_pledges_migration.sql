-- Create bank_pledge_parameters table
CREATE TABLE public.bank_pledge_parameters (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.fournisseurs(id),
    bank_id uuid NOT NULL REFERENCES public.banks(id),
    campagne_id uuid NOT NULL REFERENCES public.campagnes(id),
    type_application text NOT NULL CHECK (type_application IN ('REVERSEMENT', 'SOUTIENT')),
    
    taux_prix_contrat numeric,
    taux_prix_marche numeric,
    taux_drd_finance numeric,
    taux_valeurs_debours numeric,
    taux_valeur_locaux_mag numeric,
    taux_sequestre numeric,
    prix_sequestre_kg numeric,
    
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT bank_pledge_parameters_pkey PRIMARY KEY (id)
);

-- RLS
ALTER TABLE public.bank_pledge_parameters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow Select for Org" ON public.bank_pledge_parameters 
FOR SELECT TO authenticated 
USING (
  organization_id IN (SELECT fournisseur_id FROM fournisseur_staff WHERE user_id = auth.uid()) 
  OR organization_id IN (SELECT id FROM fournisseurs WHERE user_profile_id = auth.uid())
);

CREATE POLICY "Allow Insert for Org" ON public.bank_pledge_parameters 
FOR INSERT TO authenticated 
WITH CHECK (
  organization_id IN (SELECT fournisseur_id FROM fournisseur_staff WHERE user_id = auth.uid()) 
  OR organization_id IN (SELECT id FROM fournisseurs WHERE user_profile_id = auth.uid())
);

CREATE POLICY "Allow Update for Org" ON public.bank_pledge_parameters 
FOR UPDATE TO authenticated 
USING (
  organization_id IN (SELECT fournisseur_id FROM fournisseur_staff WHERE user_id = auth.uid()) 
  OR organization_id IN (SELECT id FROM fournisseurs WHERE user_profile_id = auth.uid())
);

CREATE POLICY "Allow Delete for Org" ON public.bank_pledge_parameters 
FOR DELETE TO authenticated 
USING (
  organization_id IN (SELECT fournisseur_id FROM fournisseur_staff WHERE user_id = auth.uid()) 
  OR organization_id IN (SELECT id FROM fournisseurs WHERE user_profile_id = auth.uid())
);
