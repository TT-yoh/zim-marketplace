-- Add image_url to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_url text;

-- Create product-images bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS for storage.objects
-- Note: You may need to enable RLS on storage.objects if it's not already
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow public read access to product-images
CREATE POLICY "Public Read Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'product-images' );

-- Allow authenticated users to upload images to product-images
CREATE POLICY "Authenticated users can upload images" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK ( bucket_id = 'product-images' );

-- Allow users to update and delete their own uploaded images
CREATE POLICY "Users can update own images" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING ( bucket_id = 'product-images' AND auth.uid() = owner )
WITH CHECK ( bucket_id = 'product-images' AND auth.uid() = owner );

CREATE POLICY "Users can delete own images" 
ON storage.objects FOR DELETE 
TO authenticated 
USING ( bucket_id = 'product-images' AND auth.uid() = owner );
