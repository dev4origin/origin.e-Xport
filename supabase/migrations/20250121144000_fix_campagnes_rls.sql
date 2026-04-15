-- Enable RLS
ALTER TABLE "public"."campagnes" ENABLE ROW LEVEL SECURITY;

-- Policy for SELECT
DROP POLICY IF EXISTS "Enable read for authenticated users only" ON "public"."campagnes";
CREATE POLICY "Enable read for authenticated users only"
ON "public"."campagnes"
FOR SELECT
TO authenticated
USING (true);

-- Policy for INSERT
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON "public"."campagnes";
CREATE POLICY "Enable insert for authenticated users only"
ON "public"."campagnes"
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy for UPDATE
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON "public"."campagnes";
CREATE POLICY "Enable update for authenticated users only"
ON "public"."campagnes"
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
