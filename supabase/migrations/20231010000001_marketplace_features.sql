-- Add category and condition to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category text DEFAULT 'Uncategorized';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS condition text DEFAULT 'New';

-- Create vendor_profiles table for conversational commerce and trust
CREATE TABLE IF NOT EXISTS public.vendor_profiles (
    id uuid REFERENCES auth.users NOT NULL PRIMARY KEY,
    store_name text NOT NULL,
    whatsapp_number text NOT NULL,
    is_verified boolean DEFAULT false,
    rating numeric(3, 2) DEFAULT 0.00,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on vendor_profiles
ALTER TABLE public.vendor_profiles ENABLE ROW LEVEL SECURITY;

-- Allow public read of vendor profiles (so buyers can see store names and WhatsApp links)
CREATE POLICY "Public Read Vendor Profiles" 
ON public.vendor_profiles FOR SELECT 
USING ( true );

-- Allow users to insert and update their own profiles
CREATE POLICY "Users can insert own profile" 
ON public.vendor_profiles FOR INSERT 
TO authenticated 
WITH CHECK ( auth.uid() = id );

CREATE POLICY "Users can update own profile" 
ON public.vendor_profiles FOR UPDATE 
TO authenticated 
USING ( auth.uid() = id )
WITH CHECK ( auth.uid() = id );
