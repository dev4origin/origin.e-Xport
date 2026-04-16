-- Add new columns to public.export_contracts
ALTER TABLE public.export_contracts 
ADD COLUMN IF NOT EXISTS volume_mt NUMERIC,
ADD COLUMN IF NOT EXISTS prix_unitaire NUMERIC,
ADD COLUMN IF NOT EXISTS devise TEXT DEFAULT 'EUR',
ADD COLUMN IF NOT EXISTS incoterm TEXT DEFAULT 'FOB',
ADD COLUMN IF NOT EXISTS date_signature DATE,
ADD COLUMN IF NOT EXISTS fichier_contrat_url TEXT,
ADD COLUMN IF NOT EXISTS numero_cv TEXT,
ADD COLUMN IF NOT EXISTS fichier_cv_url TEXT,
ADD COLUMN IF NOT EXISTS produit TEXT,
ADD COLUMN IF NOT EXISTS quality_assessment TEXT,
ADD COLUMN IF NOT EXISTS packing TEXT DEFAULT 'Bags, new food grade jute bags fit for overseas',
ADD COLUMN IF NOT EXISTS weight_condition TEXT,
ADD COLUMN IF NOT EXISTS payment_condition TEXT DEFAULT 'CAD in trust',
ADD COLUMN IF NOT EXISTS numero_contrat TEXT,
-- Financial Fields for Financing/Pledging
ADD COLUMN IF NOT EXISTS prix_caf_deblocage NUMERIC,
ADD COLUMN IF NOT EXISTS drd NUMERIC,
ADD COLUMN IF NOT EXISTS taux_reversement NUMERIC,
ADD COLUMN IF NOT EXISTS taux_soutien NUMERIC,
ADD COLUMN IF NOT EXISTS statut_contrat TEXT;

-- Consolidate: if quantite_a_executer was used, move to volume_mt and drop the old column
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='export_contracts' AND column_name='quantite_a_executer') THEN
        UPDATE public.export_contracts SET volume_mt = quantite_a_executer WHERE volume_mt IS NULL;
        ALTER TABLE public.export_contracts DROP COLUMN quantite_a_executer;
    END IF;
END $$;

-- Handle existing data if reference_contrat was used
UPDATE public.export_contracts SET numero_contrat = reference_contrat WHERE numero_contrat IS NULL AND reference_contrat IS NOT NULL;

-- Create storage bucket for export contract documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('export_contracts_docs', 'export_contracts_docs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for export_contracts_docs
-- Allow public read access
DROP POLICY IF EXISTS "Public Read Access Export Contracts" ON storage.objects;
CREATE POLICY "Public Read Access Export Contracts" ON storage.objects
FOR SELECT USING (bucket_id = 'export_contracts_docs');

-- Allow authenticated uploads
DROP POLICY IF EXISTS "Authenticated Upload Access Export Contracts" ON storage.objects;
CREATE POLICY "Authenticated Upload Access Export Contracts" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'export_contracts_docs' AND auth.role() = 'authenticated');

-- Allow authenticated updates
DROP POLICY IF EXISTS "Authenticated Update Access Export Contracts" ON storage.objects;
CREATE POLICY "Authenticated Update Access Export Contracts" ON storage.objects
FOR UPDATE WITH CHECK (bucket_id = 'export_contracts_docs' AND auth.role() = 'authenticated');

-- RLS Policies for public.export_contracts table
ALTER TABLE public.export_contracts ENABLE ROW LEVEL SECURITY;

-- Allow users to see only contracts of their organization
DROP POLICY IF EXISTS "Users can view their own organization export contracts" ON public.export_contracts;
CREATE POLICY "Users can view their own organization export contracts" ON public.export_contracts
FOR SELECT USING (
  organization_id IN (
    SELECT fournisseur_id FROM public.fournisseur_staff WHERE user_id = auth.uid()
  ) OR 
  organization_id IN (
    SELECT id FROM public.fournisseurs WHERE user_profile_id = auth.uid()
  )
);

-- Allow users to insert contracts for their organization
DROP POLICY IF EXISTS "Users can insert export contracts for their own organization" ON public.export_contracts;
CREATE POLICY "Users can insert export contracts for their own organization" ON public.export_contracts
FOR INSERT WITH CHECK (
  organization_id IN (
    SELECT fournisseur_id FROM public.fournisseur_staff WHERE user_id = auth.uid()
  ) OR 
  organization_id IN (
    SELECT id FROM public.fournisseurs WHERE user_profile_id = auth.uid()
  )
);

-- Allow users to update contracts of their organization
DROP POLICY IF EXISTS "Users can update their own organization export contracts" ON public.export_contracts;
CREATE POLICY "Users can update their own organization export contracts" ON public.export_contracts
FOR UPDATE USING (
  organization_id IN (
    SELECT fournisseur_id FROM public.fournisseur_staff WHERE user_id = auth.uid()
  ) OR 
  organization_id IN (
    SELECT id FROM public.fournisseurs WHERE user_profile_id = auth.uid()
  )
);

-- Allow users to delete contracts of their organization
DROP POLICY IF EXISTS "Users can delete their own organization export contracts" ON public.export_contracts;
CREATE POLICY "Users can delete their own organization export contracts" ON public.export_contracts
FOR DELETE USING (
  organization_id IN (
    SELECT fournisseur_id FROM public.fournisseur_staff WHERE user_id = auth.uid()
  ) OR 
  organization_id IN (
    SELECT id FROM public.fournisseurs WHERE user_profile_id = auth.uid()
  )
);
