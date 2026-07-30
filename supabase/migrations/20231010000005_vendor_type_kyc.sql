-- Add vendor_type to distinguish between C2C and B2B/B2C vendors
ALTER TABLE public.vendor_profiles ADD COLUMN IF NOT EXISTS vendor_type text DEFAULT 'individual';

-- Add additional KYC document fields
ALTER TABLE public.vendor_profiles ADD COLUMN IF NOT EXISTS company_registration_url text;
ALTER TABLE public.vendor_profiles ADD COLUMN IF NOT EXISTS selfie_with_id_url text;

-- (The kyc-documents storage bucket and policies were already created in 20231010000003_vendor_kyc.sql)
