-- Script to add organization_id to banks and apply RLS

-- 1. Add column if it doesn't exist
ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.fournisseurs(id);

-- 2. Create the RLS policies for complete isolation
-- Users can only SELECT banks from their organization
CREATE POLICY "Allow Select for Org" ON public.banks 
FOR SELECT TO authenticated 
USING (
  organization_id IN (SELECT fournisseur_id FROM fournisseur_staff WHERE user_id = auth.uid()) 
  OR organization_id IN (SELECT id FROM fournisseurs WHERE user_profile_id = auth.uid())
);

-- Users can only INSERT banks into their organization
CREATE POLICY "Allow Insert for Org" ON public.banks 
FOR INSERT TO authenticated 
WITH CHECK (
  organization_id IN (SELECT fournisseur_id FROM fournisseur_staff WHERE user_id = auth.uid()) 
  OR organization_id IN (SELECT id FROM fournisseurs WHERE user_profile_id = auth.uid())
);

-- Users can only UPDATE banks in their organization
CREATE POLICY "Allow Update for Org" ON public.banks 
FOR UPDATE TO authenticated 
USING (
  organization_id IN (SELECT fournisseur_id FROM fournisseur_staff WHERE user_id = auth.uid()) 
  OR organization_id IN (SELECT id FROM fournisseurs WHERE user_profile_id = auth.uid())
);

-- Optional: DELETE policy if they can delete banks
CREATE POLICY "Allow Delete for Org" ON public.banks 
FOR DELETE TO authenticated 
USING (
  organization_id IN (SELECT fournisseur_id FROM fournisseur_staff WHERE user_id = auth.uid()) 
  OR organization_id IN (SELECT id FROM fournisseurs WHERE user_profile_id = auth.uid())
);
