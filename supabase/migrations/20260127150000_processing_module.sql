-- ==============================================================================
-- 🏭 MODULE USINAGE : TRANSFORMATION & MÉLANGE
-- Date : 27 Janvier 2026
-- ==============================================================================

-- 1. TABLE DES LOTS USINÉS (OUTPUT)
CREATE TABLE IF NOT EXISTS public.machined_batches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    factory_id uuid REFERENCES public.fournisseurs(id) NOT NULL, -- L'usine/Exportateur
    
    batch_number text NOT NULL, -- Ex: LOT-USINE-2026-001
    production_date date NOT NULL DEFAULT CURRENT_DATE,
    
    output_weight_kg numeric NOT NULL, -- Poids sorti usine (ex: 25025 kg)
    input_total_weight_kg numeric, -- Somme des lots entrants (pour calculer la perte)
    
    certification_program text CHECK (certification_program IN ('Rainforest Alliance', 'Fairtrade', 'Bio', 'Conventionnel')),
    traceability_level text CHECK (traceability_level IN ('IP', 'Segregated', 'Mass Balance')),
    
    status text DEFAULT 'STOCK' CHECK (status IN ('STOCK', 'EXPORTED', 'QUARANTINE', 'PLEDGED')),
    
    created_by uuid REFERENCES auth.users(id),
    created_at timestamp with time zone DEFAULT now()
);

-- 2. TABLE DES INTRANTS (INPUTS - La Recette)
-- Lie les lots bruts (trace_batches) au lot usiné
CREATE TABLE IF NOT EXISTS public.processing_inputs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    machined_batch_id uuid REFERENCES public.machined_batches(id),
    source_batch_id uuid REFERENCES public.trace_batches(id), -- Le lot brut consommé
    
    weight_used_kg numeric NOT NULL, -- Combien on a pris de ce lot
    
    created_at timestamp with time zone DEFAULT now()
);

-- Indexation
CREATE INDEX IF NOT EXISTS idx_machined_factory ON public.machined_batches(factory_id);
CREATE INDEX IF NOT EXISTS idx_processing_inputs_batch ON public.processing_inputs(machined_batch_id);

-- SÉCURITÉ RLS
ALTER TABLE public.machined_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_inputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Voir mes lots usinés" ON public.machined_batches
FOR SELECT TO authenticated
USING (factory_id IN (SELECT fournisseur_id FROM public.fournisseur_staff WHERE user_id = auth.uid()));

CREATE POLICY "Voir mes inputs usinés" ON public.processing_inputs
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.machined_batches mb
        WHERE mb.id = processing_inputs.machined_batch_id
        AND mb.factory_id IN (SELECT fournisseur_id FROM public.fournisseur_staff WHERE user_id = auth.uid())
    )
);

CREATE POLICY "Créer des lots usinés" ON public.machined_batches
FOR INSERT TO authenticated
WITH CHECK (factory_id IN (SELECT fournisseur_id FROM public.fournisseur_staff WHERE user_id = auth.uid()));

CREATE POLICY "Créer des inputs usinés" ON public.processing_inputs
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.machined_batches mb
        WHERE mb.id = processing_inputs.machined_batch_id
        AND mb.factory_id IN (SELECT fournisseur_id FROM public.fournisseur_staff WHERE user_id = auth.uid())
    )
);


-- FONCTION : ENREGISTRER UN USINAGE (CRÉATION DU LOT)
CREATE OR REPLACE FUNCTION public.create_machined_batch(
    p_batch_number text,
    p_production_date date,
    p_output_weight_kg numeric,
    p_certification text,
    p_traceability text,
    p_source_batch_ids uuid[] -- Liste des IDs des lots bruts utilisés
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_factory_id uuid;
    v_new_batch_id uuid;
    v_total_input_weight numeric := 0;
    v_batch_id uuid;
    v_current_weight numeric;
    v_yield_percentage numeric;
BEGIN
    -- 1. Identifier l'usine (Exportateur connecté)
    SELECT fournisseur_id INTO v_factory_id
    FROM public.fournisseur_staff WHERE user_id = auth.uid() LIMIT 1;

    IF v_factory_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Utilisateur non lié à une usine');
    END IF;

    -- 2. Calculer le poids total entrant (Somme des inputs)
    SELECT SUM(poids_actuel_kg) INTO v_total_input_weight
    FROM public.trace_batches
    WHERE id = ANY(p_source_batch_ids);

    IF v_total_input_weight IS NULL OR v_total_input_weight = 0 THEN
         RETURN jsonb_build_object('success', false, 'error', 'Poids entrant nul ou lots invalides');
    END IF;

    -- 3. Créer le Lot Usiné
    INSERT INTO public.machined_batches (
        factory_id, batch_number, production_date, output_weight_kg, 
        input_total_weight_kg, certification_program, traceability_level
    ) VALUES (
        v_factory_id, p_batch_number, p_production_date, p_output_weight_kg,
        v_total_input_weight, p_certification, p_traceability
    ) RETURNING id INTO v_new_batch_id;

    -- 4. Traiter les Inputs (Boucle)
    FOREACH v_batch_id IN ARRAY p_source_batch_ids
    LOOP
        -- Récupérer poids du lot source
        SELECT poids_actuel_kg INTO v_current_weight FROM public.trace_batches WHERE id = v_batch_id;
        
        -- Créer le lien
        INSERT INTO public.processing_inputs (machined_batch_id, source_batch_id, weight_used_kg)
        VALUES (v_new_batch_id, v_batch_id, v_current_weight);

        -- Marquer le lot source comme "USINÉ" (Pour qu'il ne soit plus disponible)
        UPDATE public.trace_batches 
        SET status = 'PROCESSED', poids_actuel_kg = 0 
        WHERE id = v_batch_id;
    END LOOP;

    -- 5. Calcul du rendement (Output / Input)
    v_yield_percentage := (p_output_weight_kg / v_total_input_weight) * 100;

    RETURN jsonb_build_object(
        'success', true, 
        'batch_id', v_new_batch_id,
        'input_kg', v_total_input_weight,
        'output_kg', p_output_weight_kg,
        'yield', v_yield_percentage -- Ex: 98.5% (1.5% de perte nettoyage/séchage)
    );
END;
$$;
