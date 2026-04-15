-- Add DELETE policy for campagnes
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON "public"."campagnes";
CREATE POLICY "Enable delete for authenticated users only"
ON "public"."campagnes"
FOR DELETE
TO authenticated
USING (true);
