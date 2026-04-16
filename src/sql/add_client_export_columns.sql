-- Add new columns to public.clients_export
ALTER TABLE public.clients_export 
ADD COLUMN IF NOT EXISTS logo TEXT,
ADD COLUMN IF NOT EXISTS email_contact_commercial TEXT,
ADD COLUMN IF NOT EXISTS nom_responsable_durabilite TEXT,
ADD COLUMN IF NOT EXISTS email_responsable_durabilite TEXT;

-- Create storage bucket for client logos if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('clients_logos', 'clients_logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for clients_logos
-- Allow public read access
DROP POLICY IF EXISTS "Public Read Access Clients Logos" ON storage.objects;
CREATE POLICY "Public Read Access Clients Logos" ON storage.objects
FOR SELECT USING (bucket_id = 'clients_logos');

-- Allow authenticated uploads
DROP POLICY IF EXISTS "Authenticated Upload Access Clients Logos" ON storage.objects;
CREATE POLICY "Authenticated Upload Access Clients Logos" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'clients_logos' AND auth.role() = 'authenticated');

-- Allow authenticated updates (for overwriting if needed)
DROP POLICY IF EXISTS "Authenticated Update Access Clients Logos" ON storage.objects;
CREATE POLICY "Authenticated Update Access Clients Logos" ON storage.objects
FOR UPDATE WITH CHECK (bucket_id = 'clients_logos' AND auth.role() = 'authenticated');

-- RLS Policies for public.clients_export table
ALTER TABLE public.clients_export ENABLE ROW LEVEL SECURITY;

-- Allow users to see only clients of their organization
DROP POLICY IF EXISTS "Users can view their own organization clients" ON public.clients_export;
CREATE POLICY "Users can view their own organization clients" ON public.clients_export
FOR SELECT USING (
  organization_id IN (
    SELECT fournisseur_id FROM public.fournisseur_staff WHERE user_id = auth.uid()
  ) OR 
  organization_id IN (
    SELECT id FROM public.fournisseurs WHERE user_profile_id = auth.uid()
  )
);

-- Allow users to insert clients for their organization
DROP POLICY IF EXISTS "Users can insert clients for their own organization" ON public.clients_export;
CREATE POLICY "Users can insert clients for their own organization" ON public.clients_export
FOR INSERT WITH CHECK (
  organization_id IN (
    SELECT fournisseur_id FROM public.fournisseur_staff WHERE user_id = auth.uid()
  ) OR 
  organization_id IN (
    SELECT id FROM public.fournisseurs WHERE user_profile_id = auth.uid()
  )
);

-- Allow users to update clients of their organization
DROP POLICY IF EXISTS "Users can update their own organization clients" ON public.clients_export;
CREATE POLICY "Users can update their own organization clients" ON public.clients_export
FOR UPDATE USING (
  organization_id IN (
    SELECT fournisseur_id FROM public.fournisseur_staff WHERE user_id = auth.uid()
  ) OR 
  organization_id IN (
    SELECT id FROM public.fournisseurs WHERE user_profile_id = auth.uid()
  )
);

-- Allow users to delete clients of their organization
DROP POLICY IF EXISTS "Users can delete their own organization clients" ON public.clients_export;
CREATE POLICY "Users can delete their own organization clients" ON public.clients_export
FOR DELETE USING (
  organization_id IN (
    SELECT fournisseur_id FROM public.fournisseur_staff WHERE user_id = auth.uid()
  ) OR 
  organization_id IN (
    SELECT id FROM public.fournisseurs WHERE user_profile_id = auth.uid()
  )
);
