-- Add B2B wholesale columns to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS item_no text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS unit text DEFAULT 'EA';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price_excl_vat_cents integer DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price_incl_vat_cents integer DEFAULT 0;
