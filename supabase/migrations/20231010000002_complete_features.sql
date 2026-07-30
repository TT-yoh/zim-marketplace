-- Add status column to order_items to track per-vendor fulfillment
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

-- Create reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id uuid REFERENCES public.products NOT NULL,
    vendor_id uuid REFERENCES public.vendor_profiles NOT NULL,
    buyer_id uuid REFERENCES auth.users NOT NULL,
    rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Allow public read of reviews
CREATE POLICY "Public Read Reviews" 
ON public.reviews FOR SELECT 
USING ( true );

-- Allow buyers to insert their own reviews
CREATE POLICY "Buyers can insert reviews" 
ON public.reviews FOR INSERT 
TO authenticated 
WITH CHECK ( auth.uid() = buyer_id );

-- Allow buyers to update their own reviews
CREATE POLICY "Buyers can update own reviews" 
ON public.reviews FOR UPDATE 
TO authenticated 
USING ( auth.uid() = buyer_id )
WITH CHECK ( auth.uid() = buyer_id );


-- Create platform_admins table
CREATE TABLE IF NOT EXISTS public.platform_admins (
    id uuid REFERENCES auth.users NOT NULL PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for platform_admins
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- Allow public read of admins (so App can easily check if user is admin)
CREATE POLICY "Public Read Admins" 
ON public.platform_admins FOR SELECT 
USING ( true );
