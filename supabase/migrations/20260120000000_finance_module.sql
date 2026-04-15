-- ==============================================================================
-- 🏦 MODULE FINANCE : BANQUES & NANTISSEMENTS (COLLATERAL MANAGEMENT)
-- ==============================================================================

-- 1. Référentiel Banques
CREATE TABLE IF NOT EXISTS public.banks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nom_banque text NOT NULL, -- Ex: "NSIA", "SOCIETE GENERALE"
    code_bic text,
    contact_gestionnaire text,
    email_gestionnaire text,
    created_at timestamptz DEFAULT now()
);

-- 2. Dossiers de Nantissement (Pledge Agreements)
CREATE TABLE IF NOT EXISTS public.pledge_files (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES public.fournisseurs(id),
    bank_id uuid REFERENCES public.banks(id),

    reference_dossier text NOT NULL, -- Ex: "NANT-2026-005"
    date_demande date DEFAULT CURRENT_DATE,
    date_validation date,

    montant_financement_demande numeric,
    devise text DEFAULT 'XOF',

    statut text DEFAULT 'DRAFT' CHECK (statut IN ('DRAFT', 'SUBMITTED', 'ACTIVE', 'CLOSED', 'REJECTED')),

    document_tierce_detention_url text, -- Scan du document signé
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now()
);

-- 3. Liaison Lots <-> Nantissement
-- C'est cette table qui "verrouille" physiquement les lots
CREATE TABLE IF NOT EXISTS public.pledged_lots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pledge_file_id uuid REFERENCES public.pledge_files(id) NOT NULL,
    machined_batch_id uuid REFERENCES public.machined_batches(id) NOT NULL,

    valeur_assignee numeric, -- Valeur du lot au moment du nantissement

    statut_lot_pledge text DEFAULT 'LOCKED' CHECK (statut_lot_pledge IN ('LOCKED', 'RELEASED')),
    date_release timestamp with time zone, -- Date du dénantissement

    UNIQUE(machined_batch_id) -- Un lot ne peut être nanti qu'une fois à la fois !
);

-- 4. Trigger de Sécurité : Mise à jour du statut du lot principal
-- (DÉSACTIVÉ TEMPORAIREMENT POUR ÉVITER LES DEADLOCKS)
CREATE OR REPLACE FUNCTION public.manage_batch_lock_status()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        -- Verrouiller le lot principal
        UPDATE public.machined_batches 
        SET status = 'PLEDGED' 
        WHERE id = NEW.machined_batch_id;
    ELSIF (TG_OP = 'UPDATE' AND NEW.statut_lot_pledge = 'RELEASED') THEN
        -- Libérer le lot principal
        UPDATE public.machined_batches 
        SET status = 'STOCK' 
        WHERE id = NEW.machined_batch_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lock_pledged_batch ON public.pledged_lots;
CREATE TRIGGER trg_lock_pledged_batch
AFTER INSERT OR UPDATE ON public.pledged_lots
FOR EACH ROW EXECUTE FUNCTION public.manage_batch_lock_status();

-- 5. RLS pour Finance
ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pledge_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pledged_lots ENABLE ROW LEVEL SECURITY;

-- Note: Policies need to be adjusted based on actual roles in production
CREATE POLICY "Acces Banques Public" ON public.banks FOR SELECT TO authenticated USING (true);

-- Exemple de politique plus stricte (à adapter)
-- CREATE POLICY "Acces Finance Org" ON public.pledge_files 
-- FOR ALL TO authenticated USING (
--     EXISTS (SELECT 1 FROM public.fournisseur_staff WHERE user_id = auth.uid() AND fournisseur_id = organization_id)
-- );
