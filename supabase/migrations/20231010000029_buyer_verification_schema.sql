-- Migration: Add buyer_verifications table and security policies
CREATE TABLE IF NOT EXISTS public.buyer_verifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    buyer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name text NOT NULL,
    phone_number text NOT NULL,
    id_document_url text NOT NULL,
    proof_of_residence_url text,
    delivery_city text DEFAULT 'Harare',
    delivery_address text,
    status text DEFAULT 'pending' NOT NULL, -- 'pending', 'verified', 'rejected'
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.buyer_verifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to prevent conflicts
DROP POLICY IF EXISTS "Buyers can view their own verification" ON public.buyer_verifications;
CREATE POLICY "Buyers can view their own verification" 
ON public.buyer_verifications FOR SELECT 
TO authenticated 
USING (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Buyers can insert their own verification" ON public.buyer_verifications;
CREATE POLICY "Buyers can insert their own verification" 
ON public.buyer_verifications FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Buyers can update their own verification" ON public.buyer_verifications;
CREATE POLICY "Buyers can update their own verification" 
ON public.buyer_verifications FOR UPDATE 
TO authenticated 
USING (auth.uid() = buyer_id)
WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Admins full access to buyer verifications" ON public.buyer_verifications;
CREATE POLICY "Admins full access to buyer verifications" 
ON public.buyer_verifications FOR ALL 
TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid())
);
