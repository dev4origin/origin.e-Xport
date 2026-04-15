-- Migration pour ajouter la colonne bareme à la table campagnes
-- Permet de stocker les données dynamiques du barème importé (CSV)

ALTER TABLE public.campagnes 
ADD COLUMN IF NOT EXISTS bareme jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.campagnes.bareme IS 'Stocke les détails du barème (Taxes, Redevances, etc.) importés depuis le CSV officiel';
