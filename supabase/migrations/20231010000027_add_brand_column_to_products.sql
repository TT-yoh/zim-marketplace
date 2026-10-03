-- 20231010000027_add_brand_column_to_products.sql
-- Add brand column to products table for universal inventory templates and buyer filtering

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS brand text DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products(brand);
