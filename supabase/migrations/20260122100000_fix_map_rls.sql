-- Enable RLS (just in case)
ALTER TABLE public.parcelles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polygones ENABLE ROW LEVEL SECURITY;

-- Policy for Parcelles: Allow authenticated users to view ALL parcelles (or restrict if needed)
-- For debugging/production in this context, we usually want partners to see linked data.
-- Since the app filters by logic, a broad SELECT permission is often acceptable for these entities.
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.parcelles;
CREATE POLICY "Enable read access for authenticated users"
ON public.parcelles
FOR SELECT
TO authenticated
USING (true);

-- Policy for Polygones
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.polygones;
CREATE POLICY "Enable read access for authenticated users"
ON public.polygones
FOR SELECT
TO authenticated
USING (true);
