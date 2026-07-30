-- 20231010000006_checkout_shipping.sql

-- 1. Create buyer_addresses table
CREATE TABLE IF NOT EXISTS public.buyer_addresses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    buyer_id uuid REFERENCES auth.users NOT NULL,
    full_name text NOT NULL,
    street_address text NOT NULL,
    city text NOT NULL,
    province text NOT NULL,
    phone_number text NOT NULL,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.buyer_addresses ENABLE ROW LEVEL SECURITY;

-- Policies for buyer_addresses
CREATE POLICY "Users can view their own addresses" 
ON public.buyer_addresses FOR SELECT 
TO authenticated 
USING (auth.uid() = buyer_id);

CREATE POLICY "Users can insert their own addresses" 
ON public.buyer_addresses FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Users can update their own addresses" 
ON public.buyer_addresses FOR UPDATE 
TO authenticated 
USING (auth.uid() = buyer_id)
WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Users can delete their own addresses" 
ON public.buyer_addresses FOR DELETE 
TO authenticated 
USING (auth.uid() = buyer_id);

-- 2. Alter orders table to link to shipping address and store fee
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_address_id uuid REFERENCES public.buyer_addresses(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_fee_cents integer DEFAULT 0;
