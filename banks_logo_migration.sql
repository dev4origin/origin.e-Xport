-- 1. Add new columns to the banks table
ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS nom_gestionnaire text;
ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS iban text;
ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS type_compte text;

-- 2. Create the Storage Bucket for bank logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('banks_logos', 'banks_logos', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Set RLS for the banks_logos bucket
-- Allow public read access to logos
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'banks_logos');

-- Allow authenticated users to upload logos
CREATE POLICY "Auth Insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'banks_logos');

-- Allow authenticated users to update logos
CREATE POLICY "Auth Update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'banks_logos');

-- Allow authenticated users to delete logos
CREATE POLICY "Auth Delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'banks_logos');
