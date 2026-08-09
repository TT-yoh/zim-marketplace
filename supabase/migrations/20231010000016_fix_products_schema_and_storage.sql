-- 20231010000016_fix_products_schema_and_storage.sql
-- Ensure all columns needed by BulkProductUpload exist on the products table

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS item_no text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS unit text DEFAULT 'EA';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price_cents integer DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price_excl_vat_cents integer DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price_incl_vat_cents integer DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock_quantity integer DEFAULT 1;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category text DEFAULT 'Uncategorized';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sub_category text DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS condition text DEFAULT 'New';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS colors jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sizes jsonb DEFAULT '[]'::jsonb;

-- Fix storage RLS: allow authenticated vendors to INSERT (upload) to product-images
-- Drop conflicting old policies
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Public upload access for product images" ON storage.objects;
DROP POLICY IF EXISTS "Public update access for product images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own images" ON storage.objects;

-- Authenticated INSERT (vendors must be logged in)
CREATE POLICY "Authenticated upload to product-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'product-images' );

-- Authenticated UPDATE (no owner check — needed for upsert)
CREATE POLICY "Authenticated update product-images"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'product-images' );
