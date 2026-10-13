-- 20231010000030_hero_promotions_and_featured.sql
-- Add promotion and hero spotlight columns to products table

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_promotion boolean DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS promo_discount_percent integer DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_featured_hero boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_products_is_promotion ON public.products(is_promotion);
CREATE INDEX IF NOT EXISTS idx_products_is_featured_hero ON public.products(is_featured_hero);
