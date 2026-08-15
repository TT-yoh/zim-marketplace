-- 20231010000018_fix_storage_buckets_and_rls.sql
-- Ensure both product-images and kyc-documents buckets exist and have proper public & upload policies

-- 1. Ensure storage buckets exist and are public
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-documents', 'kyc-documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Drop old conflicting storage policies
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload to product-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update product-images" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Access product-images" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Access kyc-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow Upload product-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow Upload kyc-documents" ON storage.objects;

-- 3. Public Read Policies
CREATE POLICY "Public Read Access product-images"
ON storage.objects FOR SELECT
USING ( bucket_id = 'product-images' );

CREATE POLICY "Public Read Access kyc-documents"
ON storage.objects FOR SELECT
USING ( bucket_id = 'kyc-documents' );

-- 4. Universal Upload Policies (allow authenticated & anon users to upload files to storage)
CREATE POLICY "Allow Upload product-images"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'product-images' );

CREATE POLICY "Allow Upload kyc-documents"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'kyc-documents' );

-- 5. Universal Update/Upsert Policies
CREATE POLICY "Allow Update product-images"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'product-images' );

CREATE POLICY "Allow Update kyc-documents"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'kyc-documents' );
