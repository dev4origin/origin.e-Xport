-- Add sigle column to fournisseurs table
ALTER TABLE "public"."fournisseurs" 
ADD COLUMN IF NOT EXISTS "sigle" text;
