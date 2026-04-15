-- Migration pour ajouter les colonnes d'audit à la table campagnes

ALTER TABLE public.campagnes 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id);

COMMENT ON COLUMN public.campagnes.created_by IS 'Utilisateur ayant créé la campagne (Add_By)';
COMMENT ON COLUMN public.campagnes.updated_by IS 'Dernier utilisateur ayant modifié la campagne (Maj_By)';
