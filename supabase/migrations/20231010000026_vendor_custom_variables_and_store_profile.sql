-- 20231010000026_vendor_custom_variables_and_store_profile.sql
-- Adds dedicated columns for shop owner customizable variables to vendor_profiles

ALTER TABLE public.vendor_profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.vendor_profiles ADD COLUMN IF NOT EXISTS slogan TEXT;
ALTER TABLE public.vendor_profiles ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.vendor_profiles ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE public.vendor_profiles ADD COLUMN IF NOT EXISTS business_address TEXT;
ALTER TABLE public.vendor_profiles ADD COLUMN IF NOT EXISTS pickup_instructions TEXT;
ALTER TABLE public.vendor_profiles ADD COLUMN IF NOT EXISTS operating_hours TEXT;
ALTER TABLE public.vendor_profiles ADD COLUMN IF NOT EXISTS support_email TEXT;
ALTER TABLE public.vendor_profiles ADD COLUMN IF NOT EXISTS secondary_phone TEXT;
ALTER TABLE public.vendor_profiles ADD COLUMN IF NOT EXISTS return_policy TEXT;
ALTER TABLE public.vendor_profiles ADD COLUMN IF NOT EXISTS warranty_policy TEXT;
ALTER TABLE public.vendor_profiles ADD COLUMN IF NOT EXISTS delivery_turnaround TEXT;
ALTER TABLE public.vendor_profiles ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 3;
ALTER TABLE public.vendor_profiles ADD COLUMN IF NOT EXISTS payout_details JSONB DEFAULT '{}'::jsonb;
