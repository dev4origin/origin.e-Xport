-- Add metrics columns to public.export_contracts

ALTER TABLE public.export_contracts 
ADD COLUMN IF NOT EXISTS prix_caf_deblocage numeric,
ADD COLUMN IF NOT EXISTS drd numeric,
ADD COLUMN IF NOT EXISTS taux_reversement numeric,
ADD COLUMN IF NOT EXISTS taux_soutien numeric,
ADD COLUMN IF NOT EXISTS statut_contrat text;

-- We can optionally add a constraint if we want to secure statut, but simple logic is enough.
