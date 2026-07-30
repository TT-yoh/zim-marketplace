-- Add id_document_url to vendor_profiles
ALTER TABLE public.vendor_profiles ADD COLUMN IF NOT EXISTS id_document_url text;

-- Create storage bucket for KYC documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('kyc-documents', 'kyc-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own KYC documents
CREATE POLICY "Users can upload their own KYC documents" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read of KYC documents (simplest approach for admins to view)
CREATE POLICY "Anyone can view KYC documents" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'kyc-documents');
